import { sql } from "drizzle-orm";
import type { EvidenceWindow } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { assertWindowCurrent, loadSegments, loadFacts, PATIENT_ID } from "../store.ts";
import { rankBm25 } from "./lexical.ts";
import { filterWindowHits, resultLimit, searchScope, type ScopedHit, type SearchOptions } from "./scope.ts";

let paradeAvailable: Promise<boolean> | undefined;

async function hasParadeDb(): Promise<boolean> {
  paradeAvailable ??= getDb().execute(sql`select 1 from pg_extension where extname = 'pg_search'`)
    .then((result) => {
      const available = result.rows.length > 0;
      if (!available) {
        console.warn("bm25_fallback", {
          reason: "pg_search unavailable; using scoped in-process BM25",
        });
      }
      return available;
    });
  try { return await paradeAvailable; }
  catch (error) { paradeAvailable = undefined; throw error; }
}

/** Escape user syntax by admitting only letter/number tokens into field-qualified OR clauses. */
export function bm25Query(query: string): string {
  const tokens = [...new Set(query.match(/[\p{L}\p{N}]+/gu) ?? [])].slice(0, 128);
  return tokens.flatMap((term) => [`text:"${term}"`, `text_en:"${term}"`]).join(" OR ");
}

export async function bm25Search(query: string, window: EvidenceWindow, opts: SearchOptions = {}) {
  const limit = resultLimit(opts.k);
  const parsed = bm25Query(query);
  if (!parsed || !window.eligibleDocumentIds.length) return [];
  const patientId = opts.patientId ?? PATIENT_ID;
  await assertWindowCurrent(window, patientId);
  if (!await hasParadeDb()) {
    const [segments, facts] = await Promise.all([
      loadSegments(window, patientId),
      opts.kinds?.length ? loadFacts(window, opts.kinds, patientId) : undefined,
    ]);
    const allowed = facts ? new Set(facts.map((fact) => fact.segmentId)) : null;
    const hits = rankBm25(query, segments.filter((segment) => !allowed || allowed.has(segment.id)), limit);
    await assertWindowCurrent(window, patientId);
    return hits;
  }
  const result = await getDb().execute(sql`
    select s.id as "segmentId", s.document_id as "documentId", s.patient_id as "patientId",
      d.revision_id as "corpusRevision", paradedb.score(s.id) as score
    from segments s join documents d on d.id = s.document_id
    where s.id @@@ paradedb.parse(${parsed}) and ${searchScope(window, opts)}
    order by score desc, s.id asc limit ${limit}
  `);
  await assertWindowCurrent(window, patientId);
  return filterWindowHits(result.rows as ScopedHit[], window, patientId);
}
