import type { EvidenceWindow } from "../contracts.ts";
import { assertWindowCurrent, PATIENT_ID } from "../store.ts";
import { bm25Search } from "./bm25.ts";
import { resultLimit, type SearchHit, type SearchOptions } from "./scope.ts";
import { vectorSearch } from "./vector.ts";

export type HybridHit = SearchHit & { bm25Rank: number | null; vectorRank: number | null };

export function reciprocalRankFusion(bm25: SearchHit[], vector: SearchHit[], constant = 60): HybridHit[] {
  if (!Number.isFinite(constant) || constant < 0) throw new Error("Invalid RRF constant");
  const hits = new Map<string, HybridHit>();
  for (const [list, rankKey] of [[bm25, "bm25Rank"], [vector, "vectorRank"]] as const) {
    const seen = new Set<string>();
    for (const hit of list) {
      if (seen.has(hit.segmentId)) continue;
      seen.add(hit.segmentId);
      const rank = seen.size;
      const fused = hits.get(hit.segmentId) ?? {
        ...hit, score: 0, bm25Rank: null, vectorRank: null,
      };
      if (fused.documentId !== hit.documentId) throw new Error("Inconsistent segment document");
      fused.score += 1 / (constant + rank);
      fused[rankKey] = rank;
      hits.set(hit.segmentId, fused);
    }
  }
  return [...hits.values()].sort((a, b) => b.score - a.score || a.segmentId.localeCompare(b.segmentId));
}

export async function hybridSearch(
  query: string,
  window: EvidenceWindow,
  opts: SearchOptions = {},
): Promise<HybridHit[]> {
  const limit = resultLimit(opts.k);
  if (!query.trim() || !window.eligibleDocumentIds.length) return [];
  const patientId = opts.patientId ?? PATIENT_ID;
  await assertWindowCurrent(window, patientId);
  const candidates = { ...opts, k: Math.min(1000, Math.max(60, limit * 3)) };
  const [bm25, vector] = await Promise.all([
    bm25Search(query, window, candidates),
    vectorSearch(query, window, candidates).catch((error: unknown) => {
      console.warn("vector_search_unavailable", { reason: error instanceof Error ? error.message : "Embedding failed" });
      return [];
    }),
  ]);
  await assertWindowCurrent(window, patientId);
  return reciprocalRankFusion(bm25, vector).slice(0, limit);
}
