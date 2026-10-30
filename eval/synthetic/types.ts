import type { Fact } from "@medlyn/engine/contracts";

export type Span = { documentId: string; start: number; end: number };
export type LabelFact = Pick<
  Fact,
  | "id"
  | "documentId"
  | "kind"
  | "labelEn"
  | "attrs"
  | "assertion"
  | "temporalStatus"
  | "eventDate"
  | "datePrecision"
  | "quote"
  | "start"
  | "end"
> & { needIds?: string[] };
export type LabelFinding = {
  id: string;
  category: string;
  severity: string;
  passages: Span[];
  explanation: string;
};
export type SyntheticPatient = {
  patient: { id: string; name: string; sex: string; dateOfBirth: string };
  documents: { metadata: { id: string; date: string; [key: string]: unknown }; text: string }[];
  labels: {
    facts: LabelFact[];
    mutations: {
      id: string;
      type: string;
      documentId: string;
      start: number;
      end: number;
      original: string;
      mutated: string;
      factId: string | null;
      contradictionId: string | null;
    }[];
    contradictions: LabelFinding[];
    distractors: { id: string; type: string; passages: Span[] }[];
    gaps: { needId: string; concept: string }[];
  };
};
export type Question =
  | { id: string; type: "facts"; text: string; needId: string; expected: LabelFact[] }
  | { id: string; type: "gap"; text: string; needId: string; concept: string }
  | {
      id: string;
      type: "contradictions";
      text: string;
      expected: LabelFinding[];
      distractors: SyntheticPatient["labels"]["distractors"];
    };
export type Challenge = {
  id: string;
  patientId: string;
  tier: 1 | 2 | 3;
  profileId: string | null;
  situation: string;
  asOf: string;
  mutationTypes: string[];
  questions: [Question, Question, Question];
};
export type QuestionScore = {
  id: string;
  type: Question["type"];
  pass: boolean;
  answer: boolean;
  citation: boolean;
  method: "deterministic" | "llm";
  reason: string;
};
