import { sql } from "drizzle-orm";
import type { EvidenceWindow } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { assertWindowCurrent, PATIENT_ID } from "../store.ts";
import { EMBEDDING_DIM, EMBEDDING_MODEL, embed } from "./embed.ts";
import {
  filterWindowHits,
  resultLimit,
  type ScopedHit,
  type SearchOptions,
  searchScope,
} from "./scope.ts";

export async function vectorSearch(
  query: string,
  window: EvidenceWindow,
  opts: SearchOptions = {},
) {
  const limit = resultLimit(opts.k);
  if (!query.trim() || !window.eligibleDocumentIds.length || !process.env.GEMINI_API_KEY) return [];
  const patientId = opts.patientId ?? PATIENT_ID;
  await assertWindowCurrent(window, patientId);
  const vectors = await embed([query], { task: "RETRIEVAL_QUERY", timeoutMs: 4000, retries: 0 });
  if (!vectors?.length) return [];
  const value = JSON.stringify(vectors[0]);
  // Exact cosine ordering within the eligible set avoids HNSW post-filter recall loss on small windows.
  const result = await getDb().execute(sql`
    with eligible as materialized (
      select s.id, s.document_id, s.patient_id, d.revision_id, e.embedding
      from segment_embeddings e join segments s on s.id = e.segment_id
      join documents d on d.id = s.document_id
      where ${searchScope(window, opts)} and e.patient_id = ${patientId}
        and e.model = ${EMBEDDING_MODEL} and e.dim = ${EMBEDDING_DIM}
    )
    select id as "segmentId", document_id as "documentId", patient_id as "patientId",
      revision_id as "corpusRevision", 1 - (embedding <=> ${value}::vector) as score
    from eligible order by embedding <=> ${value}::vector, id asc limit ${limit}
  `);
  await assertWindowCurrent(window, patientId);
  return filterWindowHits(result.rows as ScopedHit[], window, patientId);
}
