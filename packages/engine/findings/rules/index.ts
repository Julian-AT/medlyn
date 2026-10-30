import { bmiCandidates } from "./bmi.ts";
import { caseIdCandidates, lymphNodeCandidates } from "./clarification.ts";
import { admissionCandidates, biopsyDateCandidates, restatedDateCandidates } from "./dates.ts";
import { sideCandidates } from "./side.ts";
import type { Candidate, FindingInput } from "../types.ts";

export function ruleCandidates(input: FindingInput): Candidate[] {
  return [
    ...sideCandidates(input), ...bmiCandidates(input), ...biopsyDateCandidates(input),
    ...restatedDateCandidates(input), ...admissionCandidates(input),
    ...lymphNodeCandidates(input), ...caseIdCandidates(input),
  ].filter((candidate) => candidate.passages.length >= 2);
}
