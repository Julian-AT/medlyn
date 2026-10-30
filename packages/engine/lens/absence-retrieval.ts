import { and, eq, inArray, isNull } from "drizzle-orm";
import type { EvidenceWindow } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { documents, segmentEmbeddings, segments } from "../db/schema.ts";
import { bm25Search } from "../search/bm25.ts";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "../search/embed.ts";
import { reciprocalRankFusion } from "../search/hybrid.ts";
import { resultLimit, type SearchOptions } from "../search/scope.ts";
import { vectorSearch } from "../search/vector.ts";
import { assertWindowCurrent, PATIENT_ID } from "../store.ts";

/** Absence proofs require both retrieval legs; a degraded search cannot prove a gap. */
export async function searchAbsenceCandidates(
  query: string,
  window: EvidenceWindow,
  opts: SearchOptions = {},
) {
  const limit = resultLimit(opts.k);
  if (!query.trim() || !window.eligibleDocumentIds.length) return [];
  if (!process.env.GEMINI_API_KEY) throw new Error("Vector retrieval is not configured");
  const patientId = opts.patientId ?? PATIENT_ID;
  await assertWindowCurrent(window, patientId);
  const candidates = { ...opts, k: Math.min(1000, Math.max(60, limit * 3)) };
  const [bm25, vector] = await Promise.all([
    bm25Search(query, window, candidates),
    vectorSearch(query, window, candidates),
    assertVectorCoverage(window, patientId),
  ]);
  await assertWindowCurrent(window, patientId);
  return reciprocalRankFusion(bm25, vector).slice(0, limit);
}

async function assertVectorCoverage(window: EvidenceWindow, patientId: string): Promise<void> {
  const missing = await getDb()
    .select({ id: segments.id })
    .from(segments)
    .innerJoin(documents, eq(segments.documentId, documents.id))
    .leftJoin(
      segmentEmbeddings,
      and(
        eq(segmentEmbeddings.segmentId, segments.id),
        eq(segmentEmbeddings.patientId, patientId),
        eq(segmentEmbeddings.model, EMBEDDING_MODEL),
        eq(segmentEmbeddings.dim, EMBEDDING_DIM),
      ),
    )
    .where(
      and(
        inArray(documents.id, window.eligibleDocumentIds),
        eq(documents.patientId, patientId),
        eq(documents.revisionId, window.corpusRevision),
        eq(segments.patientId, patientId),
        isNull(segmentEmbeddings.segmentId),
      ),
    )
    .limit(1);
  if (missing.length) throw new Error("Vector retrieval does not cover the full evidence window");
}
