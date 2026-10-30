import { and, eq, inArray, isNull } from "drizzle-orm";
import type { EvidenceWindow } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { documents, segmentEmbeddings, segments } from "../db/schema.ts";
import { bm25Search } from "../search/bm25.ts";
import { EMBEDDING_DIM, EMBEDDING_MODEL } from "../search/embed.ts";
import { type HybridHit, reciprocalRankFusion } from "../search/hybrid.ts";
import { resultLimit, type SearchOptions } from "../search/scope.ts";
import { vectorSearch } from "../search/vector.ts";
import { assertWindowCurrent, PATIENT_ID } from "../store.ts";

export type AbsenceRetrieval = {
  hits: HybridHit[];
  retrieval: "hybrid" | "lexical_fallback";
};

/** Vector recall is supplemental; the lexical scan and full-document pass prove absence. */
export async function retrieveAbsenceCandidates(
  query: string,
  window: EvidenceWindow,
  opts: SearchOptions = {},
): Promise<AbsenceRetrieval> {
  const limit = resultLimit(opts.k);
  if (!query.trim() || !window.eligibleDocumentIds.length)
    return { hits: [], retrieval: "lexical_fallback" };
  const patientId = opts.patientId ?? PATIENT_ID;
  await assertWindowCurrent(window, patientId);
  const candidates = { ...opts, k: Math.min(1000, Math.max(60, limit * 3)) };
  const supplemental = async () => {
    let hits: Awaited<ReturnType<typeof vectorSearch>> = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!process.env.GEMINI_API_KEY) throw new Error("Vector retrieval is not configured");
      await Promise.race([
        (async () => {
          hits = await vectorSearch(query, window, candidates);
          await assertVectorCoverage(window, patientId);
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Vector retrieval timed out")), 4_000);
        }),
      ]);
      return { hits, retrieval: "hybrid" as const };
    } catch (error) {
      console.warn("absence_retrieval_fallback", {
        patientId,
        asOf: window.asOf,
        retrieval: "lexical_fallback",
        reason: error instanceof Error ? error.message : "Vector retrieval failed",
      });
      return { hits, retrieval: "lexical_fallback" as const };
    } finally {
      clearTimeout(timer);
    }
  };
  const [bm25, vector] = await Promise.all([bm25Search(query, window, candidates), supplemental()]);
  await assertWindowCurrent(window, patientId);
  return {
    hits: reciprocalRankFusion(bm25, vector.hits).slice(0, limit),
    retrieval: vector.retrieval,
  };
}

export async function searchAbsenceCandidates(
  query: string,
  window: EvidenceWindow,
  opts: SearchOptions = {},
): Promise<HybridHit[]> {
  return (await retrieveAbsenceCandidates(query, window, opts)).hits;
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
