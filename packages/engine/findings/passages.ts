import { createHash } from "node:crypto";
import type { Candidate, CorpusInputDocument, FindingInput, FindingRecord, Passage } from "./types.ts";

export function lines(document: CorpusInputDocument) {
  return [...document.normText.matchAll(/[^\n]+/g)].map((match) => ({
    text: match[0], start: match.index, end: match.index + match[0].length,
  }));
}

/** Split a located range at segment boundaries; every stored quote stays inside its segment. */
export function locate(
  input: FindingInput, document: CorpusInputDocument, start: number, end: number, claimEn: string, anchor?: RegExp,
): Passage[] {
  return document.segments.flatMap((segment) => {
    const from = Math.max(start, segment.start);
    const to = Math.min(end, segment.end);
    if (to <= from || !document.normText.slice(from, to).trim()) return [];
    const quote = document.normText.slice(from, to);
    if (anchor && !anchor.test(quote)) return [];
    if (segment.text.slice(from - segment.start, to - segment.start) !== quote) return [];
    const fact = input.facts.find((f) => f.documentId === document.doc.id && f.segmentId === segment.id
      && f.locationOk && f.start <= from && f.end >= to);
    return [{ segmentId: segment.id, documentId: document.doc.id, factId: fact?.id ?? null,
      quote, start: from, end: to, claimEn }];
  });
}

export function uniquePassages(passages: Passage[]): Passage[] {
  return [...new Map(passages.map((p) => [`${p.documentId}@${p.start}-${p.end}`, p])).values()]
    .sort((a, b) => a.documentId.localeCompare(b.documentId) || a.start - b.start || a.end - b.end);
}

export function findingId(category: string, passages: Passage[]): string {
  const refs = uniquePassages(passages).map((p) => `${p.documentId}@${p.start}-${p.end}`);
  return `finding-${createHash("sha256").update(JSON.stringify([category, refs])).digest("hex").slice(0, 20)}`;
}

export function record(candidate: Candidate): FindingRecord {
  const { deterministic, ...finding } = candidate;
  const passages = uniquePassages(finding.passages);
  return { ...finding, passages, id: findingId(finding.category, passages) };
}

export function candidate(
  category: string, title: string, explanation: string, passages: Passage[],
  options: Partial<Pick<Candidate, "type" | "severity" | "computation" | "hypothesisText" | "deterministic">> = {},
): Candidate {
  return { category, title, explanation, passages: uniquePassages(passages), type: "contradiction",
    severity: "medium", computation: null, hypothesisText: null, deterministic: false, ...options };
}
