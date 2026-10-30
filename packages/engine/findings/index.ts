import { eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import { findingPassages, findings } from "../db/schema.ts";
import { adjudicate } from "./adjudicate.ts";
import { findingId, record } from "./passages.ts";
import { ruleCandidates } from "./rules/index.ts";
import { validateFindingText } from "../claims/validate.ts";
import { concurrentMap, sweep } from "./sweep.ts";
import type { Candidate, FindingInput, FindingRecord } from "./types.ts";

export type { FindingRecord } from "./types.ts";

export function sameCandidate(a: Candidate, b: Candidate): boolean {
  const overlapping = a.passages.filter((p) => b.passages.some((q) =>
    p.documentId === q.documentId && p.start < q.end && q.start < p.end));
  return overlapping.length >= 2 || (a.category === b.category && overlapping.length > 0);
}

/** Compute at ingestion from the supplied corpus; consumers apply the shared evidence window. */
export async function computeFindings(input: FindingInput, opts: { llm?: boolean } = {}): Promise<FindingRecord[]> {
  const candidates = ruleCandidates(input);
  if (opts.llm === false) return Promise.all(candidates.map((candidate) => validateFindingText(record({
    ...candidate, type: candidate.deterministic ? candidate.type : "dismissed_candidate",
  }), input)));
  const extra = await sweep(input);
  for (const candidate of extra) {
    if (!candidates.some((existing) => sameCandidate(existing, candidate))) candidates.push(candidate);
  }
  const records = await concurrentMap(candidates, async (candidate) =>
    validateFindingText(await adjudicate(candidate, input), input));
  return [...new Map(records.map((r) => [r.id, r])).values()];
}

/** Persist each finding and all its located passages atomically using the Neon HTTP batch API. */
export async function storeFindings(db: Db, patientId: string, revisionId: string, records: FindingRecord[]): Promise<void> {
  for (const record of records) {
    if (record.passages.length < 2 || record.id !== findingId(record.category, record.passages)) {
      throw new Error(`Invalid finding record ${record.id}`);
    }
    const { passages, ...finding } = record;
    await db.batch([
      db.insert(findings).values({ ...finding, patientId, revisionId })
        .onConflictDoUpdate({ target: findings.id, set: { ...finding, patientId, revisionId } }),
      db.delete(findingPassages).where(eq(findingPassages.findingId, record.id)),
      db.insert(findingPassages).values(passages.map(({ documentId, ...p }) => ({
        ...p, findingId: record.id, patientId,
      }))),
    ]);
  }
}
