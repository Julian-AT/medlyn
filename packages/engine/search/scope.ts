import { sql, type SQL } from "drizzle-orm";
import type { EvidenceWindow, FactKind } from "../contracts.ts";
import { PATIENT_ID } from "../store.ts";

export type SearchOptions = { k?: number; kinds?: FactKind[]; patientId?: string };
export type SearchHit = { segmentId: string; documentId: string; score: number };
export type ScopedHit = SearchHit & { patientId: string; corpusRevision: string };

export function resultLimit(k = 20): number {
  if (!Number.isSafeInteger(k) || k < 1 || k > 1000) throw new Error("Search k must be 1–1000");
  return k;
}

/** All SQL branches join documents as d and segments as s; dates are resolved only by store.ts. */
export function searchScope(window: EvidenceWindow, opts: SearchOptions): SQL {
  const patientId = opts.patientId ?? PATIENT_ID;
  const ids = sql.join(window.eligibleDocumentIds.map((id) => sql`${id}`), sql`, `);
  const kinds = opts.kinds?.length
    ? sql`and exists (select 1 from facts f where f.segment_id = s.id
        and f.patient_id = ${patientId} and f.location_ok = true
        and f.kind in (${sql.join(opts.kinds.map((kind) => sql`${kind}`), sql`, `)}))`
    : sql``;
  return sql`s.document_id in (${ids}) and d.revision_id = ${window.corpusRevision}
    and d.patient_id = ${patientId} and s.patient_id = ${patientId} ${kinds}`;
}

export function filterWindowHits(
  hits: ScopedHit[],
  window: EvidenceWindow,
  patientId = PATIENT_ID,
): SearchHit[] {
  const eligible = new Set(window.eligibleDocumentIds);
  return hits.filter((hit) => eligible.has(hit.documentId)
    && hit.corpusRevision === window.corpusRevision && hit.patientId === patientId)
    .map(({ segmentId, documentId, score }) => ({ segmentId, documentId, score: Number(score) }));
}
