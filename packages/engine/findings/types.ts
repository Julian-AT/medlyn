import type { Fact } from "../contracts.ts";
import type { CorpusDocument } from "../ingest/corpus.ts";

export type CorpusInputDocument = CorpusDocument;

export type FindingRecord = {
  id: string;
  type: "contradiction" | "needs_clarification" | "dismissed_candidate";
  category: string;
  title: string;
  explanation: string;
  severity: "high" | "medium" | "low";
  computation: string | null;
  hypothesisText: string | null;
  passages: {
    segmentId: string;
    documentId: string;
    factId: string | null;
    quote: string;
    start: number;
    end: number;
    claimEn: string;
  }[];
};

export type FindingInput = { documents: CorpusInputDocument[]; facts: Fact[] };
export type Candidate = Omit<FindingRecord, "id"> & { deterministic: boolean };
export type Passage = FindingRecord["passages"][number];
