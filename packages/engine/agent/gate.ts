import { createHash } from "node:crypto";
import type { AbsenceResult, Claim, EvidenceWindow, Fact } from "../contracts.ts";
import { formatDate } from "../dates.ts";
import { PATIENT_ID } from "../store.ts";
import { type Calculation, calculationClaim } from "./calculation.ts";

export type GateEvidence = {
  factIds: string[];
  segmentIds: string[];
  absences: AbsenceResult[];
  factSegments?: Record<string, string>;
  facts?: Fact[];
  calculations?: Calculation[];
};
export type SentenceValidator = (claims: Claim[]) => Promise<Claim[]>;

/** Segment sentences without breaking decimals, abbreviations or trailing citations. */
export function splitSentences(text: string): string[] {
  const result: string[] = [];
  const abbreviations = new Set([
    "dr.",
    "mr.",
    "mrs.",
    "ms.",
    "prof.",
    "e.g.",
    "i.e.",
    "vs.",
    "approx.",
    "jan.",
    "feb.",
    "mar.",
    "apr.",
    "jun.",
    "jul.",
    "aug.",
    "sep.",
    "oct.",
    "nov.",
    "dec.",
  ]);
  const normalised = text.replace(
    /([.!?])\s*((?:\[[^\]\n]+\][ \t]*)+)/g,
    (_, punctuation: string, citations: string) => ` ${citations.trim()}${punctuation} `,
  );
  for (const line of normalised
    .split(/\n+/)
    .map((value) => value.trim())
    .filter(Boolean)) {
    let start = 0;
    for (const match of line.matchAll(/[.!?](?=\s|$)/g)) {
      const end = match.index + 1;
      const token = line.slice(start, end).split(/\s+/).at(-1)?.toLowerCase() ?? "";
      if (abbreviations.has(token)) continue;
      const sentence = line.slice(start, end).trim();
      if (sentence) result.push(sentence);
      start = end;
    }
    const tail = line.slice(start).trim();
    if (tail) result.push(tail);
  }
  return result;
}

function draft(text: string, kind: Claim["kind"], factIds: string[], segmentIds: string[]): Claim {
  const hash = createHash("sha256")
    .update(JSON.stringify({ text, kind, factIds, segmentIds }))
    .digest("hex")
    .slice(0, 20);
  return {
    id: `agent-${hash}`,
    kind,
    text,
    factIds,
    segmentIds,
    author: "machine",
    validation: { key: "", support: "unsupported" },
  };
}

export function isVisible(claim: Claim): boolean {
  return claim.validation.support === "supported" || claim.validation.support === "exempt";
}

/** No generated text leaves this function unless its own claim passes validation. */
export async function gateAnswer(
  text: string,
  evidence: GateEvidence,
  window: EvidenceWindow,
  validate: SentenceValidator,
  spoken = false,
) {
  const facts = new Set(evidence.factIds);
  const segments = new Set(evidence.segmentIds);
  const candidates: Claim[] = [];
  for (const proof of evidence.calculations ?? []) {
    const claim = calculationClaim(proof, evidence.facts ?? [], { patientId: PATIENT_ID, window });
    if (claim) candidates.push(claim);
  }
  for (const sentence of splitSentences(text).slice(0, 20)) {
    const ids = [...sentence.matchAll(/\[([^\]]+)\]/g)]
      .flatMap((match) => match[1].split(/[,;\s]+/))
      .filter(Boolean);
    if (!ids.length || ids.some((id) => !facts.has(id) && !segments.has(id))) continue;
    // Absence is rendered only from a completed full-corpus check.
    if (/not documented|no (?:record|documentation|evidence)|couldn.t check/i.test(sentence))
      continue;
    const factIds = ids.filter((id) => facts.has(id));
    const segmentIds = [
      ...new Set([
        ...ids.filter((id) => segments.has(id)),
        ...factIds.flatMap((id) =>
          evidence.factSegments?.[id] ? [evidence.factSegments[id]] : [],
        ),
      ]),
    ];
    candidates.push(
      draft(sentence.replace(/\s*\[[^\]]+\]/g, "").trim(), "composed", factIds, segmentIds),
    );
  }
  for (const absence of evidence.absences) {
    if (
      absence.status !== "not_documented" ||
      absence.searched.asOf !== window.asOf ||
      absence.searched.eligible !== window.eligibleDocumentIds.length
    )
      continue;
    const completion = absence.concept.match(
      /^documented completion after \d{4}-\d{2}-\d{2} of:\s*(.+?)\.(?:\s|$)/i,
    );
    const date = formatDate(window.asOf);
    const count = absence.searched.eligible;
    const text = completion
      ? `${completion[1]}: no record of completion in the ${count} eligible documents as of ${date}.`
      : `${absence.concept}: not documented as of ${date} · searched ${count} of ${count} eligible documents`;
    candidates.push(draft(text, "absence", [], []));
  }
  const checked = candidates.length ? await validate(candidates) : [];
  const byId = new Map(checked.map((claim) => [claim.id, claim]));
  const claims = candidates
    .flatMap((candidate) => {
      const checkedClaim = byId.get(candidate.id);
      return checkedClaim && checkedClaim.text === candidate.text && isVisible(checkedClaim)
        ? [checkedClaim]
        : [];
    })
    .slice(0, spoken ? 2 : 12);
  const action =
    claims.length && claims.every((claim) => claim.kind !== "absence")
      ? "Add to the GP letter"
      : "Leave open";
  return { claims, nextAction: action };
}
