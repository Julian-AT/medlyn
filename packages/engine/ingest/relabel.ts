import { pathToFileURL } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Fact, type Segment } from "../contracts.ts";
import { type Db, getDb } from "../db/client.ts";
import * as t from "../db/schema.ts";
import { assertWindowCurrent, evidenceWindow, loadEvidence, PATIENT_ID } from "../store.ts";
import type { CorpusDocument } from "./corpus.ts";
import { rehash, VALIDATOR_VERSION } from "./extract.ts";
import { contentHash, factId } from "./hash.ts";
import { germanLabelTokens, normaliseLabel } from "./label-normalise.ts";
import { locate } from "./locate.ts";
import { checkSemantics } from "./semantic.ts";

export type LabelChange = { before: Fact; after: Fact };

export function prepareLabelChanges(facts: Fact[], segments: Segment[]): LabelChange[] {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return facts.flatMap((fact) => {
    const labelEn = normaliseLabel(fact.labelEn);
    if (labelEn === fact.labelEn) return [];
    if (fact.contentHash !== contentHash(fact) || fact.id !== factId(fact.contentHash)) {
      throw new Error(`Label migration requires a current fact identity: ${fact.id}`);
    }
    const segment = byId.get(fact.segmentId);
    const location =
      segment &&
      locate(fact.quote, segment, { labelEn, attrs: fact.attrs, eventDate: fact.eventDate });
    if (
      !fact.locationOk ||
      !segment ||
      segment.documentId !== fact.documentId ||
      !location?.ok ||
      location.start !== fact.start ||
      location.end !== fact.end ||
      location.quote !== fact.quote
    ) {
      throw new Error(`Label migration requires a located fact: ${fact.id}`);
    }
    return [
      { before: fact, after: rehash({ ...fact, labelEn, validatorVersion: VALIDATOR_VERSION }) },
    ];
  });
}

/** Fail closed: semantic corrections may translate labels but cannot alter the clinical record. */
export function validateLabelChanges(changes: LabelChange[], checked: Fact[]): LabelChange[] {
  const remaining = new Set(checked);
  const result = changes.map(({ before, after }) => {
    const matches = checked.filter(
      (fact) =>
        fact.segmentId === before.segmentId &&
        fact.contentHash === rehash({ ...before, labelEn: fact.labelEn }).contentHash,
    );
    const verified = matches.find(
      (fact) =>
        fact.support === "supported" &&
        fact.locationOk &&
        fact.contentHash === contentHash(fact) &&
        fact.id === factId(fact.contentHash) &&
        !germanLabelTokens(fact.labelEn).length,
    );
    if (!verified) throw new Error(`Label failed semantic recheck: ${before.id}`);
    remaining.delete(verified);
    return {
      before,
      after: {
        ...after,
        labelEn: verified.labelEn,
        id: verified.id,
        contentHash: verified.contentHash,
        support: verified.support,
        negationFlag: verified.negationFlag,
      },
    };
  });
  if (remaining.size) throw new Error("Semantic recheck changed fields outside the label");
  return result;
}

export function buildRelabelQueries(
  db: Db,
  patientId: string,
  changes: LabelChange[],
): [BatchItem<"pg">, ...BatchItem<"pg">[]] {
  if (!changes.length) throw new Error("No label changes to apply");
  const queries: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.delete(t.validations).where(eq(t.validations.patientId, patientId)),
    db.delete(t.lensCache).where(eq(t.lensCache.patientId, patientId)),
  ];
  const replacements = [...new Map(changes.map(({ after }) => [after.id, after])).values()];
  for (const after of replacements) {
    queries.push(
      db
        .insert(t.facts)
        .values({ ...after, patientId })
        .onConflictDoNothing(),
    );
  }
  for (const { before, after } of changes) {
    queries.push(
      db
        .update(t.findingPassages)
        .set({ factId: after.id })
        .where(
          and(eq(t.findingPassages.patientId, patientId), eq(t.findingPassages.factId, before.id)),
        ),
    );
  }
  const keep = new Set(replacements.map((fact) => fact.id));
  const obsolete = changes.map(({ before }) => before.id).filter((id) => !keep.has(id));
  if (obsolete.length)
    queries.push(
      db
        .delete(t.facts)
        .where(and(eq(t.facts.patientId, patientId), inArray(t.facts.id, obsolete))),
    );
  return queries;
}

export async function relabel(patientId = PATIENT_ID, apply = false) {
  const window = await evidenceWindow(undefined, patientId);
  const evidence = await loadEvidence(window, patientId);
  const documents: CorpusDocument[] = evidence.documents.map(({ normText, ...doc }) => ({
    doc,
    normText,
    rawText: normText,
    offsetMap: [],
    segments: evidence.segments
      .filter((segment) => segment.documentId === doc.id)
      .map((segment, ordinal) => ({ ...segment, ordinal })),
  }));
  const prepared = prepareLabelChanges(
    evidence.facts.map((fact) => Fact.parse(fact)),
    evidence.segments,
  );
  const summary = { patientId, candidates: prepared.length, applied: false };
  if (!prepared.length || !apply) return summary;
  const checked = await checkSemantics(documents, [
    ...new Map(prepared.map(({ after }) => [after.id, after])).values(),
  ]);
  const changes = validateLabelChanges(prepared, checked);
  await assertWindowCurrent(window, patientId);
  await getDb().batch(buildRelabelQueries(getDb(), patientId, changes));
  return { ...summary, applied: true, changed: changes.length };
}

export function relabelArgs(args: string[]) {
  let patientId = PATIENT_ID;
  let apply = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--apply") apply = true;
    else if (args[index] === "--patient" && args[index + 1] && !args[index + 1].startsWith("--"))
      patientId = args[++index];
    else throw new Error("Usage: relabel.ts [--patient <id>] [--apply]");
  }
  return { patientId, apply };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { patientId, apply } = relabelArgs(process.argv.slice(2));
  relabel(patientId, apply).then(
    (summary) => console.log(JSON.stringify({ type: "relabel_summary", ...summary })),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
