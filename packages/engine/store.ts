import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { validateFindingText } from "./claims/validate.ts";
import type { Document, EvidenceWindow, Fact, FactKind, Finding, Segment } from "./contracts.ts";
import { getDb } from "./db/client.ts";
import * as t from "./db/schema.ts";
import type { FindingInput, FindingRecord } from "./findings/types.ts";

export const PATIENT_ID = "patient-0000-0001";

/** Replacement uses stable document ids, so stale windows cannot safely read the new rows. */
export async function assertWindowCurrent(
  window: EvidenceWindow,
  patientId = PATIENT_ID,
): Promise<void> {
  const db = getDb();
  const latest = db
    .select({ id: t.corpusRevisions.id })
    .from(t.corpusRevisions)
    .where(eq(t.corpusRevisions.patientId, patientId))
    .orderBy(desc(t.corpusRevisions.createdAt))
    .limit(1);
  const rows = await db
    .select({ revision: t.corpusRevisions.id, documentId: t.documents.id })
    .from(t.corpusRevisions)
    .leftJoin(
      t.documents,
      and(
        eq(t.documents.revisionId, t.corpusRevisions.id),
        eq(t.documents.patientId, patientId),
        inArray(t.documents.id, window.eligibleDocumentIds),
      ),
    )
    .where(
      and(
        eq(t.corpusRevisions.id, window.corpusRevision),
        eq(t.corpusRevisions.patientId, patientId),
        eq(t.corpusRevisions.id, latest),
      ),
    );
  const present = new Set(rows.flatMap((row) => (row.documentId === null ? [] : [row.documentId])));
  if (!rows.length || window.eligibleDocumentIds.some((id) => !present.has(id))) {
    throw new Error("Evidence window is stale or incomplete; reload the corpus window");
  }
}

export async function currentRevision(patientId = PATIENT_ID): Promise<string> {
  const [row] = await getDb()
    .select({ id: t.corpusRevisions.id })
    .from(t.corpusRevisions)
    .where(eq(t.corpusRevisions.patientId, patientId))
    .orderBy(desc(t.corpusRevisions.createdAt))
    .limit(1);
  if (!row) throw new Error(`No corpus revision for ${patientId}; run pnpm ingest`);
  return row.id;
}

/** The one evidence window (invariant 5): eligible means doc_date <= asOf. Default asOf is the latest document date. */
export async function evidenceWindow(
  asOf?: string,
  patientId = PATIENT_ID,
): Promise<EvidenceWindow> {
  const revision = await currentRevision(patientId);
  const docs = await getDb()
    .select({ id: t.documents.id, docDate: t.documents.docDate })
    .from(t.documents)
    .where(and(eq(t.documents.patientId, patientId), eq(t.documents.revisionId, revision)))
    .orderBy(asc(t.documents.docDate));
  if (!docs.length) throw new Error(`No documents for corpus revision ${revision}`);
  const effective = asOf ?? docs.at(-1)!.docDate;
  const window = {
    asOf: effective,
    eligibleDocumentIds: docs.filter((d) => d.docDate <= effective).map((d) => d.id),
    corpusRevision: revision,
  };
  await assertWindowCurrent(window, patientId);
  return window;
}

export async function documentCount(patientId = PATIENT_ID): Promise<number> {
  const revision = await currentRevision(patientId);
  return (
    await getDb()
      .select({ id: t.documents.id })
      .from(t.documents)
      .where(and(eq(t.documents.patientId, patientId), eq(t.documents.revisionId, revision)))
  ).length;
}

export type EvidenceData = {
  documents: (Document & { normText: string })[];
  segments: Segment[];
  facts: Fact[];
  total: number;
};

async function guarded<T>(
  window: EvidenceWindow,
  patientId: string,
  read: () => Promise<T>,
): Promise<T> {
  await assertWindowCurrent(window, patientId);
  const result = await read();
  await assertWindowCurrent(window, patientId);
  return result;
}

async function readDocuments(
  window: EvidenceWindow,
  patientId: string,
): Promise<EvidenceData["documents"]> {
  if (!window.eligibleDocumentIds.length) return [];
  const rows = await getDb()
    .select()
    .from(t.documents)
    .where(
      and(
        inArray(t.documents.id, window.eligibleDocumentIds),
        eq(t.documents.revisionId, window.corpusRevision),
        eq(t.documents.patientId, patientId),
      ),
    )
    .orderBy(asc(t.documents.docDate));
  if (rows.length !== new Set(window.eligibleDocumentIds).size)
    throw new Error("Evidence documents are incomplete");
  return rows.map(({ rawText, offsetMap, ...doc }) => doc);
}

async function readSegments(window: EvidenceWindow, patientId: string): Promise<Segment[]> {
  if (!window.eligibleDocumentIds.length) return [];
  const rows = await getDb()
    .select({ segment: t.segments })
    .from(t.segments)
    .innerJoin(t.documents, eq(t.segments.documentId, t.documents.id))
    .where(
      and(
        inArray(t.segments.documentId, window.eligibleDocumentIds),
        eq(t.segments.patientId, patientId),
        eq(t.documents.patientId, patientId),
        eq(t.documents.revisionId, window.corpusRevision),
      ),
    )
    .orderBy(asc(t.segments.documentId), asc(t.segments.ordinal));
  return rows.map(({ segment: { patientId, ordinal, ...segment } }) => segment);
}

async function readFacts(
  window: EvidenceWindow,
  patientId: string,
  kinds?: FactKind[],
): Promise<Fact[]> {
  if (!window.eligibleDocumentIds.length) return [];
  const rows = await getDb()
    .select({ fact: t.facts })
    .from(t.facts)
    .innerJoin(t.documents, eq(t.facts.documentId, t.documents.id))
    .where(
      and(
        inArray(t.facts.documentId, window.eligibleDocumentIds),
        eq(t.facts.patientId, patientId),
        eq(t.documents.patientId, patientId),
        eq(t.documents.revisionId, window.corpusRevision),
        eq(t.facts.locationOk, true),
        kinds?.length ? inArray(t.facts.kind, kinds) : undefined,
      ),
    );
  return rows.map(({ fact: { patientId, ...fact } }) => ({ ...fact, locationOk: true }) as Fact);
}

export async function loadDocuments(
  window: EvidenceWindow,
  patientId = PATIENT_ID,
): Promise<EvidenceData["documents"]> {
  return guarded(window, patientId, () => readDocuments(window, patientId));
}

export async function loadSegments(
  window: EvidenceWindow,
  patientId = PATIENT_ID,
): Promise<Segment[]> {
  return guarded(window, patientId, () => readSegments(window, patientId));
}

export async function loadFacts(
  window: EvidenceWindow,
  kinds?: FactKind[],
  patientId = PATIENT_ID,
): Promise<Fact[]> {
  return guarded(window, patientId, () => readFacts(window, patientId, kinds));
}

/** One request-local evidence load, guarded before and after every parallel read finishes. */
export async function loadEvidence(
  window: EvidenceWindow,
  patientId = PATIENT_ID,
): Promise<EvidenceData> {
  return guarded(window, patientId, async () => {
    const [documents, segments, facts, allDocuments] = await Promise.all([
      readDocuments(window, patientId),
      readSegments(window, patientId),
      readFacts(window, patientId),
      getDb()
        .select({ id: t.documents.id })
        .from(t.documents)
        .where(
          and(
            eq(t.documents.patientId, patientId),
            eq(t.documents.revisionId, window.corpusRevision),
          ),
        ),
    ]);
    return { documents, segments, facts, total: allDocuments.length };
  });
}

/** Findings are computed once at ingest; one is shown only when every passage is eligible. */
async function loadFindingsUncached(
  window: EvidenceWindow,
  patientId = PATIENT_ID,
  sources?: Promise<Pick<EvidenceData, "documents" | "segments">>,
): Promise<Finding[]> {
  await assertWindowCurrent(window, patientId);
  const db = getDb();
  const rows = await db
    .select()
    .from(t.findings)
    .where(
      and(
        eq(t.findings.patientId, patientId),
        eq(t.findings.revisionId, window.corpusRevision),
        inArray(t.findings.type, ["contradiction", "needs_clarification"]),
      ),
    );
  if (!rows.length) {
    await assertWindowCurrent(window, patientId);
    return [];
  }
  const passages = await db
    .select({ p: t.findingPassages, documentId: t.segments.documentId })
    .from(t.findingPassages)
    .innerJoin(t.segments, eq(t.findingPassages.segmentId, t.segments.id))
    .innerJoin(t.documents, eq(t.segments.documentId, t.documents.id))
    .where(
      and(
        inArray(
          t.findingPassages.findingId,
          rows.map((r) => r.id),
        ),
        eq(t.documents.revisionId, window.corpusRevision),
        eq(t.documents.patientId, patientId),
        eq(t.findingPassages.patientId, patientId),
        eq(t.segments.patientId, patientId),
      ),
    );
  const eligible = new Set(window.eligibleDocumentIds);
  const records: FindingRecord[] = rows
    .map((f) => ({
      id: f.id,
      category: f.category,
      type: f.type as Finding["type"],
      title: f.title,
      explanation: f.explanation,
      severity: f.severity,
      computation: f.computation,
      hypothesisText: f.hypothesisText,
      passages: passages
        .filter(({ p }) => p.findingId === f.id)
        .map(({ p, documentId }) => ({
          segmentId: p.segmentId,
          documentId,
          factId: p.factId,
          quote: p.quote,
          start: p.start,
          end: p.end,
          claimEn: p.claimEn,
        })),
    }))
    .filter((f) => f.passages.length >= 2 && f.passages.every((p) => eligible.has(p.documentId)));
  const { documents, segments } = sources
    ? await sources
    : await Promise.all([loadDocuments(window, patientId), loadSegments(window, patientId)]).then(
        ([documents, segments]) => ({ documents, segments }),
      );
  if (
    documents.some((doc) => doc.patientId !== patientId || doc.revisionId !== window.corpusRevision)
  ) {
    throw new Error("Finding evidence belongs to another patient or revision");
  }
  const input: FindingInput = {
    facts: [],
    documents: documents.map((document) => {
      const { normText, ...doc } = document;
      return {
        doc,
        normText,
        rawText: normText,
        offsetMap: [],
        segments: segments
          .filter((segment) => segment.documentId === doc.id)
          .map((segment, ordinal) => ({ ...segment, ordinal })),
      };
    }),
  };
  const checked = await Promise.all(
    records.map((record) => validateFindingText(record, input, window)),
  );
  await assertWindowCurrent(window, patientId);
  return checked
    .filter((record) => record.type !== "dismissed_candidate")
    .map(({ category, ...record }) => ({ ...record, type: record.type as Finding["type"] }));
}

export async function latestDocDate(patientId = PATIENT_ID): Promise<string> {
  return (await evidenceWindow(undefined, patientId)).asOf;
}

// Findings are fixed per corpus revision; only the revision guard needs to run on every call.
const findingsByWindow = new Map<string, Promise<Finding[]>>();

export async function loadFindings(
  window: EvidenceWindow,
  patientId = PATIENT_ID,
  sources?: Promise<Pick<EvidenceData, "documents" | "segments">>,
): Promise<Finding[]> {
  await assertWindowCurrent(window, patientId);
  const key = `${patientId}|${window.corpusRevision}|${window.asOf}|${window.eligibleDocumentIds.join(",")}`;
  let findings = findingsByWindow.get(key);
  if (!findings) {
    findings = loadFindingsUncached(window, patientId, sources);
    findings.catch(() => findingsByWindow.delete(key));
    findingsByWindow.set(key, findings);
    if (findingsByWindow.size > 50)
      findingsByWindow.delete(findingsByWindow.keys().next().value as string);
  }
  return findings;
}
