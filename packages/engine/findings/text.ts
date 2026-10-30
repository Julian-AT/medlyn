import { findingId } from "./passages.ts";
import { ruleCandidates } from "./rules/index.ts";
import type { FindingInput, FindingRecord } from "./types.ts";
import { locate } from "../ingest/locate.ts";

export const FINDING_FALLBACK = "Conflicting statements: see passages";
export const CLARIFICATION_FALLBACK = "Statements need clarification: see passages";
export const PASSAGE_FALLBACK = "See source passage.";

/** Regenerate rule wording from evidence; model prose is never a display template. */
export function findingText(record: FindingRecord, input: FindingInput): FindingRecord {
  const sameIdentity = findingId(record.category, record.passages) === record.id;
  const rule = sameIdentity ? ruleCandidates(input).find((candidate) =>
    findingId(candidate.category, candidate.passages) === record.id) : undefined;
  const fallback = record.type === "contradiction" ? FINDING_FALLBACK : CLARIFICATION_FALLBACK;
  const faithful = rule?.deterministic && rule.type === record.type;
  return {
    ...record,
    title: faithful ? rule.title : fallback,
    explanation: faithful ? rule.explanation : fallback,
    computation: faithful ? rule.computation : null,
    hypothesisText: null,
    passages: record.passages.map((passage) => {
      const text = rule?.passages.find((checked) => checked.segmentId === passage.segmentId &&
        checked.start === passage.start && checked.end === passage.end &&
        checked.quote === passage.quote)?.claimEn;
      const segment = input.documents.find((document) => document.doc.id === passage.documentId)
        ?.segments.find((segment) => segment.id === passage.segmentId);
      const checked = text && segment && locate(passage.quote, segment, { text }).ok;
      return { ...passage, claimEn: checked ? text : PASSAGE_FALLBACK };
    }),
  };
}

export function findingTexts(record: FindingRecord): string[] {
  return [record.title, record.explanation, record.computation, record.hypothesisText,
    ...record.passages.map((passage) => passage.claimEn)].filter((text): text is string => text !== null);
}

export function findingPassagesLocated(record: FindingRecord, input: FindingInput): boolean {
  return record.passages.length >= 2 && record.passages.every((passage) => {
    const document = input.documents.find((item) => item.doc.id === passage.documentId);
    const segment = document?.segments.find((item) => item.id === passage.segmentId);
    return !!segment && passage.start >= segment.start && passage.end <= segment.end &&
      passage.end > passage.start && !!passage.quote.trim() &&
      segment.text.slice(passage.start - segment.start, passage.end - segment.start) === passage.quote &&
      document?.normText.slice(passage.start, passage.end) === passage.quote;
  });
}
