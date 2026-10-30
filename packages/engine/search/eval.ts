import type { EvidenceWindow, FactKind, Segment } from "../contracts.ts";
import { loadSegments, PATIENT_ID } from "../store.ts";
import { bm25Search } from "./bm25.ts";
import { hybridSearch } from "./hybrid.ts";
import { vectorSearch } from "./vector.ts";
import { resultLimit } from "./scope.ts";

export type RetrievalMode = "bm25" | "vector" | "hybrid";
export type RelevantSpan = { documentId: string; start: number; end: number };
export type RetrievalCase = {
  id: string;
  query: string;
  window: EvidenceWindow;
  patientId?: string;
  kinds?: FactKind[];
  relevantSegmentIds?: string[];
  relevantSpans?: RelevantSpan[];
};
export type RetrievalMetrics = {
  recallAtK: number;
  mrr: number;
  evaluated: number;
  skipped: number;
  k: number;
};

export function relevantSegments(spans: RelevantSpan[], segments: Segment[]): string[] {
  return [...new Set(segments.filter((segment) => spans.some((span) =>
    span.documentId === segment.documentId && span.start < segment.end && span.end > segment.start,
  )).map((segment) => segment.id))];
}

export function scoreRetrieval(ranked: string[], relevant: string[], k = 20) {
  resultLimit(k);
  const wanted = new Set(relevant);
  if (!wanted.size) return null;
  const top = [...new Set(ranked)].slice(0, k);
  const first = top.findIndex((id) => wanted.has(id));
  return {
    recallAtK: top.filter((id) => wanted.has(id)).length / wanted.size,
    mrr: first < 0 ? 0 : 1 / (first + 1),
  };
}

/** Macro recall@k and truncated MRR; cases without eligible relevance labels are skipped. */
export async function evaluateRetrieval(cases: RetrievalCase[], mode: RetrievalMode, k = 20) {
  resultLimit(k);
  const search = { bm25: bm25Search, vector: vectorSearch, hybrid: hybridSearch }[mode];
  const metrics: RetrievalMetrics = { recallAtK: 0, mrr: 0, evaluated: 0, skipped: 0, k };
  const results = [];
  for (const entry of cases) {
    const patientId = entry.patientId ?? PATIENT_ID;
    const segments = await loadSegments(entry.window, patientId);
    const allowed = new Set(segments.map((segment) => segment.id));
    const relevant = [...new Set([
      ...entry.relevantSegmentIds ?? [],
      ...relevantSegments(entry.relevantSpans ?? [], segments),
    ])].filter((id) => allowed.has(id));
    if (!relevant.length) { metrics.skipped++; continue; }
    const hits = await search(entry.query, entry.window, { k, kinds: entry.kinds, patientId });
    const score = scoreRetrieval(hits.map((hit) => hit.segmentId), relevant, k)!;
    metrics.evaluated++;
    metrics.recallAtK += score.recallAtK;
    metrics.mrr += score.mrr;
    results.push({ id: entry.id, ...score, relevant, retrieved: hits.map((hit) => hit.segmentId) });
  }
  if (metrics.evaluated) {
    metrics.recallAtK /= metrics.evaluated;
    metrics.mrr /= metrics.evaluated;
  }
  return { mode, metrics, results };
}
