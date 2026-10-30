import type { Segment } from "../contracts.ts";
import type { SearchHit } from "./scope.ts";

export function searchTokens(text: string): string[] {
  return text.toLowerCase().replaceAll("ß", "ss").normalize("NFD")
    .replace(/\p{M}/gu, "").match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** BM25 (k1=1.2, b=0.75), scoped to the supplied corpus, for hosts without pg_search. */
export function rankBm25(query: string, segments: Segment[], k = 20): SearchHit[] {
  const terms = new Set(searchTokens(query));
  if (!terms.size || !segments.length) return [];
  const docs = segments.map((segment) => {
    const tokens = searchTokens(`${segment.text} ${segment.textEn ?? ""}`);
    const frequencies = new Map<string, number>();
    for (const token of tokens) {
      if (terms.has(token)) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }
    return { segment, length: tokens.length, frequencies };
  });
  const average = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const doc of docs) for (const term of doc.frequencies.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  return docs.map(({ segment, length, frequencies }) => {
    let score = 0;
    for (const [term, count] of frequencies) {
      const frequency = df.get(term)!;
      const idf = Math.log(1 + (docs.length - frequency + 0.5) / (frequency + 0.5));
      score += idf * (count * 2.2) / (count + 1.2 * (0.25 + 0.75 * length / average));
    }
    return { segmentId: segment.id, documentId: segment.documentId, score };
  }).filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.segmentId.localeCompare(b.segmentId)).slice(0, k);
}
