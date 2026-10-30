import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { Document, Fact, Screen, Segment } from "@medlyn/engine/contracts";
import { loadDocuments, loadFacts, loadSegments } from "@medlyn/engine/store";
import { cards } from "../screen.ts";

export type Evidence = {
  documents: (Document & { normText: string })[];
  facts: Fact[];
  segments: Segment[];
};
export type Check = { pass: boolean; checked: number; located?: number; failures: string[] };
const loaded = new Map<string, Promise<Evidence>>();

export function loadEvidence(screen: Screen): Promise<Evidence> {
  const key = JSON.stringify([screen.patient.id, screen.window]);
  let promise = loaded.get(key);
  if (!promise) {
    promise = Promise.all([
      loadDocuments(screen.window),
      loadFacts(screen.window),
      loadSegments(screen.window),
    ]).then(([documents, facts, segments]) => ({ documents, facts, segments }));
    loaded.set(key, promise);
  }
  return promise;
}

export function checkTraceability(screen: Screen, evidence: Evidence): Check {
  const facts = new Map(evidence.facts.map((f) => [f.id, f]));
  const segments = new Map(evidence.segments.map((s) => [s.id, s]));
  const documents = new Map(evidence.documents.map((d) => [d.id, d]));
  const eligible = new Set(screen.window.eligibleDocumentIds);
  const claims = cards(screen).flatMap((c) => [...c.lines, ...(c.headline ? [c.headline] : [])]);
  const ids = new Set([
    ...claims.flatMap((c) => c.factIds),
    ...screen.findings.flatMap((f) => f.passages.flatMap((p) => (p.factId ? [p.factId] : []))),
  ]);
  const failures: string[] = [];
  let located = 0;
  for (const id of ids) {
    const fact = facts.get(id);
    if (!fact) {
      failures.push(`${id}: fact missing or locationOk is false`);
      continue;
    }
    const segment = segments.get(fact.segmentId);
    const doc = documents.get(fact.documentId);
    if (
      !fact.locationOk ||
      !fact.quote ||
      !doc ||
      !segment ||
      !eligible.has(fact.documentId) ||
      doc.revisionId !== screen.window.corpusRevision ||
      segment.documentId !== fact.documentId ||
      fact.start < segment.start ||
      fact.end > segment.end ||
      fact.start >= fact.end ||
      doc.normText.slice(fact.start, fact.end) !== fact.quote
    )
      failures.push(`${id}: quote location mismatch`);
    else located++;
  }
  for (const claim of claims) {
    if (claim.kind === "template" && !claim.factIds.length)
      failures.push(`${claim.id}: template has no located facts`);
    for (const id of claim.segmentIds) {
      const segment = segments.get(id);
      if (!segment || !eligible.has(segment.documentId))
        failures.push(`${claim.id}: segment ${id} missing or ineligible`);
    }
    for (const id of claim.factIds) {
      const fact = facts.get(id);
      if (fact && !claim.segmentIds.includes(fact.segmentId))
        failures.push(`${claim.id}: fact ${id} not linked to its segment`);
    }
  }
  for (const finding of screen.findings) {
    for (const passage of finding.passages) {
      const segment = segments.get(passage.segmentId);
      const doc = documents.get(passage.documentId);
      if (
        !doc ||
        !segment ||
        segment.documentId !== passage.documentId ||
        !passage.quote ||
        passage.start < segment.start ||
        passage.end > segment.end ||
        passage.start >= passage.end ||
        doc.normText.slice(passage.start, passage.end) !== passage.quote
      )
        failures.push(`${finding.id}: passage location mismatch`);
    }
  }
  if (cards(screen).length === 0) failures.push("Screen has no cards");
  return { pass: failures.length === 0, checked: ids.size, located, failures };
}

export function checkCitation(
  screen: Screen,
  evidence: Evidence,
  sources: string[],
  cardIds?: string[],
): Check {
  if (!sources.length) return { pass: true, checked: 0, failures: [] };
  const segments = new Map(evidence.segments.map((s) => [s.id, s]));
  const candidates = cards(screen).filter((c) => !cardIds || cardIds.includes(c.id));
  const hasCitation = candidates.some((c) =>
    c.lines.some((line) =>
      line.segmentIds.some((id) => {
        const segment = segments.get(id);
        return (
          segment &&
          sources.includes(segment.documentId) &&
          screen.window.eligibleDocumentIds.includes(segment.documentId)
        );
      }),
    ),
  );
  return {
    pass: hasCitation,
    checked: 1,
    failures: hasCitation ? [] : ["No answering card line cites an expected document"],
  };
}

export function checkAvailability(screen: Screen): Check {
  const failures: string[] = [];
  for (const card of cards(screen)) {
    if (card.availability === "unavailable") failures.push(`${card.id}: unavailable`);
    if (card.availability !== "not_documented") continue;
    if (
      !card.searched ||
      card.searched.eligible !== screen.window.eligibleDocumentIds.length ||
      card.searched.total < card.searched.eligible ||
      card.searched.asOf !== screen.window.asOf
    ) {
      failures.push(`${card.id}: absence check does not cover the evidence window`);
    }
    if (!card.lines.some((l) => l.kind === "absence" && l.validation.support === "supported")) {
      failures.push(`${card.id}: gap lacks a validated absence claim`);
    }
  }
  return { pass: !failures.length, checked: cards(screen).length, failures };
}

export async function checkComposed(screen: Screen, evidence: Evidence): Promise<Check> {
  const claims = cards(screen)
    .flatMap((c) => [...c.lines, ...(c.headline ? [c.headline] : [])])
    .filter((c) => c.kind === "composed");
  if (!claims.length) return { pass: true, checked: 0, failures: [] };
  const checked = await new Promise<{ id: string; validation: { support: string } }[]>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          "--experimental-strip-types",
          "--no-warnings",
          fileURLToPath(new URL("../revalidate.ts", import.meta.url)),
        ],
        {
          env: { ...process.env, DATABASE_URL: "" },
          stdio: ["pipe", "pipe", "pipe"],
          timeout: 120_000,
        },
      );
      let output = "";
      let errors = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk: string) => {
        errors += chunk;
      });
      child.on("error", reject);
      child.stdin.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`Independent claim validation failed (${code}): ${errors.slice(0, 300)}`),
          );
          return;
        }
        try {
          resolve(JSON.parse(output));
        } catch (error) {
          reject(error);
        }
      });
      child.stdin.end(
        JSON.stringify({
          claims,
          context: {
            patientId: screen.patient.id,
            window: screen.window,
            facts: evidence.facts,
            segments: evidence.segments,
          },
        }),
      );
    },
  );
  const failures = claims
    .filter((claim) => checked.find((c) => c.id === claim.id)?.validation.support !== "supported")
    .map((claim) => `${claim.id}: independent composed claim recheck not supported`);
  return { pass: !failures.length, checked: claims.length, failures };
}
