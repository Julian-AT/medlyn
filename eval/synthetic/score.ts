import type { Card, Claim, Fact, Finding, Screen } from "@medlyn/engine/contracts";
import { required } from "../../packages/engine/required.ts";
import { checkAvailability, checkTraceability, type Evidence } from "../assertions/evidence.ts";
import { cards } from "../screen.ts";
import { labelFactMatchesNeed } from "./challenges.ts";
import type { Challenge, LabelFact, LabelFinding, Question, QuestionScore, Span } from "./types.ts";

const fold = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const supported = (claim: Claim) => claim.validation.support === "supported";
export const overlaps = (a: Span, b: Span) =>
  a.documentId === b.documentId && a.start < b.end && b.start < a.end;
function includesAttrs(actual: unknown, expected: unknown): boolean {
  if (expected === null || typeof expected !== "object") return actual === expected;
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => includesAttrs(actual[index], item))
    );
  return (
    !!actual &&
    typeof actual === "object" &&
    Object.entries(expected).every(([key, value]) =>
      includesAttrs((actual as Record<string, unknown>)[key], value),
    )
  );
}
export function sameFact(actual: Fact, expected: LabelFact): boolean {
  return (
    actual.kind === expected.kind &&
    actual.assertion === expected.assertion &&
    actual.temporalStatus === expected.temporalStatus &&
    actual.eventDate === expected.eventDate &&
    actual.datePrecision === expected.datePrecision &&
    overlaps(actual, expected) &&
    (actual.id === expected.id || fold(actual.labelEn) === fold(expected.labelEn)) &&
    includesAttrs(actual.attrs, expected.attrs)
  );
}
function visibleFact(text: string, fact: Fact): boolean {
  const shown = fold(text);
  if (!shown.includes(fold(fact.labelEn))) return false;
  function values(value: unknown): (string | number)[] {
    if (typeof value === "number" || typeof value === "string") return [value];
    if (!value || typeof value !== "object") return [];
    return Object.values(value).flatMap(values);
  }
  return values(fact.attrs).every(
    (value) => !String(value).trim() || shown.includes(fold(String(value))),
  );
}
function passageMatch(
  actual: Finding,
  expected: {
    passages: Span[];
  },
): boolean {
  return expected.passages.every((span) =>
    actual.passages.some((passage) => overlaps(passage, span)),
  );
}
export function scoreContradictions(
  screen: Screen,
  expected: LabelFinding[],
  distractors: {
    id: string;
    passages: Span[];
  }[],
) {
  const matched = new Map<number, number>();
  function assign(labelIndex: number, seen: Set<number>): boolean {
    for (let i = 0; i < screen.findings.length; i++) {
      if (seen.has(i) || !passageMatch(screen.findings[i], expected[labelIndex])) continue;
      seen.add(i);
      const previous = matched.get(i);
      if (previous === undefined || assign(previous, seen)) {
        matched.set(i, labelIndex);
        return true;
      }
    }
    return false;
  }
  expected.forEach((_, index) => {
    assign(index, new Set());
  });
  const found = new Set(matched.values());
  const falseAlarms = screen.findings.filter((_, index) => !matched.has(index));
  const distractorIds = distractors
    .filter((label) => screen.findings.some((finding) => passageMatch(finding, label)))
    .map((label) => label.id);
  return {
    expected: expected.length,
    truePositives: found.size,
    falseAlarms: falseAlarms.length,
    net: found.size - falseAlarms.length,
    distractorIds,
    missedIds: expected.filter((_, index) => !found.has(index)).map((label) => label.id),
  };
}
export type Fallback = (
  question: Extract<
    Question,
    {
      type: "facts";
    }
  >,
  evidence: {
    expected: LabelFact[];
    candidates: {
      cardId: string;
      text: string;
      fact: Fact;
    }[];
  },
) => Promise<{
  pass: boolean;
  reason: string;
}>;
export async function scoreQuestion(
  question: Question,
  screen: Screen,
  evidence: Evidence,
  fallback?: Fallback,
): Promise<QuestionScore> {
  const base = { id: question.id, type: question.type, method: "deterministic" as const };
  if (question.type === "contradictions") {
    const result = scoreContradictions(screen, question.expected, question.distractors);
    const pass = !result.missedIds.length && !result.falseAlarms && !result.distractorIds.length;
    return { ...base, pass, answer: pass, citation: pass, reason: JSON.stringify(result) };
  }
  const matchingCards = cards(screen).filter((card) => card.needId === question.needId);
  if (question.type === "gap") {
    const pass = matchingCards.some(
      (card) =>
        card.availability === "not_documented" &&
        card.searched?.eligible === screen.window.eligibleDocumentIds.length &&
        card.searched.total >= card.searched.eligible &&
        card.searched.asOf === screen.window.asOf &&
        card.lines.some((line) => line.kind === "absence" && supported(line)),
    );
    return {
      ...base,
      pass,
      answer: pass,
      citation: pass,
      reason: pass
        ? "Validated full-window gap matches label"
        : "Expected explicit full-window gap; missing or unavailable is a failure",
    };
  }
  const byId = new Map(evidence.facts.map((fact) => [fact.id, fact]));
  const documents = new Map(evidence.documents.map((document) => [document.id, document]));
  const segments = new Map(evidence.segments.map((segment) => [segment.id, segment]));
  const located = (fact: Fact) => {
    const document = documents.get(fact.documentId);
    const segment = segments.get(fact.segmentId);
    return (
      fact.locationOk &&
      !!fact.quote &&
      !!segment &&
      !!document &&
      document.revisionId === screen.window.corpusRevision &&
      screen.window.eligibleDocumentIds.includes(fact.documentId) &&
      segment.documentId === fact.documentId &&
      fact.start >= segment.start &&
      fact.end <= segment.end &&
      document.normText.slice(fact.start, fact.end) === fact.quote
    );
  };
  const candidates = cards(screen)
    .filter((card) => card.availability === "documented")
    .flatMap((card) =>
      card.lines.filter(supported).flatMap((line) =>
        line.factIds.flatMap((id) => {
          const fact = byId.get(id);
          return fact && located(fact) && line.segmentIds.includes(fact.segmentId)
            ? [
                {
                  cardId: card.id,
                  text: `${line.text} [assertion=${line.assertion}; timing=${line.temporalStatus}]`,
                  assertion: line.assertion,
                  temporalStatus: line.temporalStatus,
                  visible: visibleFact(line.text, fact),
                  fact,
                },
              ]
            : [];
        }),
      ),
    );
  const missing = question.expected.filter(
    (expected) =>
      !candidates.some(
        ({ fact, assertion, temporalStatus, visible }) =>
          visible &&
          sameFact(fact, expected) &&
          assertion === expected.assertion &&
          temporalStatus === expected.temporalStatus,
      ),
  );
  const hasCitation = question.expected.every((expected) =>
    candidates.some(({ fact }) => overlaps(fact, expected)),
  );
  if (!missing.length)
    return {
      ...base,
      pass: true,
      answer: true,
      citation: true,
      reason: "All expected fact ids or labels, fields, assertions and timings match cited spans",
    };
  if (!hasCitation || !fallback)
    return {
      ...base,
      pass: false,
      answer: false,
      citation: hasCitation,
      reason: `${missing.length} expected facts missing; ${hasCitation ? "rubric fallback disabled" : "expected citation spans missing"}`,
    };
  const judged = await fallback(question, {
    expected: missing,
    candidates: candidates.filter(({ fact }) =>
      missing.some((expected) => overlaps(fact, expected)),
    ),
  });
  return {
    ...base,
    method: "llm",
    pass: judged.pass,
    answer: judged.pass,
    citation: true,
    reason: judged.reason,
  };
}
export function scoreAvailability(
  screen: Screen,
  patientGaps: {
    needId: string;
  }[],
  patientFacts: LabelFact[],
) {
  const checked = checkAvailability(screen);
  const failures = [...checked.failures];
  const absent = new Set(patientGaps.map((gap) => gap.needId));
  for (const card of cards(screen)) {
    if (absent.has(card.needId) && card.availability !== "not_documented")
      failures.push(`${card.needId}: expected labelled gap`);
    if (
      !absent.has(card.needId) &&
      card.availability === "not_documented" &&
      patientFacts.some((fact) => labelFactMatchesNeed(fact, card.needId))
    )
      failures.push(`${card.needId}: documented fact rendered as gap`);
    if (
      card.availability === "documented" &&
      !card.lines.some((line) => supported(line) && line.factIds.length)
    )
      failures.push(`${card.needId}: documented without supported fact line`);
  }
  return { pass: !failures.length, checked: checked.checked, failures };
}
export async function scoreScreen(
  challenge: Challenge,
  screen: Screen,
  evidence: Evidence,
  gaps: {
    needId: string;
  }[],
  facts: LabelFact[],
  fallback?: Fallback,
) {
  const questions = await Promise.all(
    challenge.questions.map((question) => scoreQuestion(question, screen, evidence, fallback)),
  );
  const traceability = checkTraceability(screen, evidence);
  const availability = scoreAvailability(screen, gaps, facts);
  const contradictions = required(
    challenge.questions.find((question) => question.type === "contradictions"),
  );
  const findings = scoreContradictions(screen, contradictions.expected, contradictions.distractors);
  const unsupported = cards(screen)
    .flatMap((card: Card) => [...card.lines, ...(card.headline ? [card.headline] : [])])
    .filter((claim) => !["supported", "exempt"].includes(claim.validation.support))
    .map((claim) => claim.id);
  return {
    questions,
    traceability,
    availability,
    findings,
    unsupported,
    pass:
      questions.every((question) => question.pass) &&
      traceability.pass &&
      availability.pass &&
      !unsupported.length,
  };
}
