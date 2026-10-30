import type { Card, Fact, Finding, Screen } from "@medlyn/engine/contracts";
import { describe, expect, it } from "../../packages/engine/node_modules/vitest/dist/index.js";
import type { Evidence } from "../assertions/evidence.ts";
import { generateChallenges } from "../synthetic/challenges.ts";
import { validatePatient } from "../synthetic/corpus.ts";
import {
  scoreAvailability,
  scoreContradictions,
  scoreQuestion,
  scoreScreen,
} from "../synthetic/score.ts";
import { parseSuite } from "../synthetic/suite.ts";
import type { Question, SyntheticPatient } from "../synthetic/types.ts";

function fixture() {
  const text =
    "HbA1c 7.2 percent.\nMetformin 500 mg.\nLeft breast diagnosis.\nFollow-up review recommended.";
  const labels = [
    ["lab", "HbA1c", { value: "7.2", unit: "percent" }],
    ["medication", "Metformin", { generic: "Metformin", strength: "500", unit: "mg" }],
    ["diagnosis", "Left breast diagnosis", { side: "left" }],
    ["recommendation", "Follow-up review", { recommendation: "review" }],
  ] as const;
  let offset = 0;
  const facts: Fact[] = text.split("\n").map((quote, index) => {
    const start = offset;
    offset += quote.length + 1;
    const [kind, labelEn, attrs] = labels[index];
    return {
      id: `fact-${index}`,
      segmentId: `doc-s${index}`,
      documentId: "doc",
      kind,
      labelEn,
      attrs,
      assertion: "present",
      temporalStatus: "stated",
      eventDate: null,
      datePrecision: null,
      dueDate: null,
      docDate: "2020-01-02",
      quote,
      start,
      end: start + quote.length,
      entityId: null,
      locationOk: true,
      support: "supported",
      negationFlag: false,
      contentHash: `hash-${index}`,
      validatorVersion: "test",
    };
  });
  const patient: SyntheticPatient = {
    patient: {
      id: "synth-test",
      name: "Synthetic Person",
      sex: "female",
      dateOfBirth: "1960-01-01",
    },
    documents: [{ metadata: { id: "doc", date: "2020-01-02" }, text }],
    labels: {
      facts,
      mutations: [],
      contradictions: [],
      distractors: [],
      gaps: [
        { needId: "kidney_function", concept: "Renal function" },
        { needId: "family_history", concept: "Family history" },
      ],
    },
  };
  const card: Card = {
    id: "card",
    needId: "hba1c",
    title: "HbA1c",
    why: "Review",
    cardType: "facts",
    critical: false,
    availability: "documented",
    completeness: "complete",
    conflict: "none",
    findingIds: [],
    lines: [
      {
        id: "line",
        kind: "template",
        text: text.split("\n")[0],
        factIds: [facts[0].id],
        segmentIds: [facts[0].segmentId],
        author: "machine",
        validation: { key: "test", support: "supported" },
        assertion: "present",
        temporalStatus: "stated",
      },
    ],
  };
  const window = { asOf: "2020-01-02", corpusRevision: "revision", eligibleDocumentIds: ["doc"] };
  const screen: Screen = {
    lensKey: "lens",
    patient: {
      id: patient.patient.id,
      displayName: patient.patient.name,
      sex: "F",
      birthDate: "1960-01-01",
      birthDateQuote: "",
      birthDateSegmentId: null,
    },
    situation: {
      role: "General practitioner",
      task: "Diabetes review",
      asOf: window.asOf,
      concerns: [],
      profileId: "gp_diabetes",
      tier: 1,
    },
    window,
    critical: [],
    sections: [{ id: "section", title: "Results", cards: [card] }],
    findings: [],
    openQuestions: [],
    timings: { planMs: 0, totalMs: 1, cached: false },
  };
  const evidence: Evidence = {
    documents: [
      {
        id: "doc",
        patientId: patient.patient.id,
        revisionId: "revision",
        title: "Test",
        titleEn: "Test",
        docType: "test",
        docDate: window.asOf,
        department: "test",
        normText: text,
      },
    ],
    facts,
    segments: facts.map((fact) => ({
      id: fact.segmentId,
      documentId: "doc",
      kind: "sentence",
      section: null,
      text: fact.quote,
      start: fact.start,
      end: fact.end,
      textEn: null,
    })),
  };
  const question: Extract<Question, { type: "facts" }> = {
    id: "q",
    type: "facts",
    text: "What is HbA1c?",
    needId: "hba1c",
    expected: [facts[0]],
  };
  return { patient, facts, screen, card, evidence, question };
}

describe("synthetic suite selection and labels", () => {
  it("defaults to real and validates explicit suite switches", () => {
    expect(parseSuite([])).toBe("real");
    expect(parseSuite(["--suite", "synthetic"])).toBe("synthetic");
    expect(parseSuite(["--suite=all"])).toBe("all");
    expect(() => parseSuite(["--suite"])).toThrow();
    expect(() => parseSuite(["--suite", "fake"])).toThrow();
    expect(() => parseSuite(["--suite=all", "--suite=real"])).toThrow();
  });
  it("generates 150 unique three-question challenges across 50 patients and all tiers", () => {
    const { patient } = fixture();
    const patients = Array.from({ length: 50 }, (_, i) => ({
      ...patient,
      patient: { ...patient.patient, id: `synth-${i}` },
    }));
    const challenges = generateChallenges(patients);
    expect(challenges).toHaveLength(150);
    expect(new Set(challenges.map((c) => c.id)).size).toBe(150);
    expect(new Set(challenges.flatMap((c) => c.questions.map((q) => q.id))).size).toBe(450);
    expect(new Set(challenges.filter((c) => c.tier === 1).map((c) => c.profileId)).size).toBe(5);
    expect(challenges.every((c) => c.questions.length === 3)).toBe(true);
    expect(generateChallenges(patients.slice(0, 20)).length).toBeGreaterThanOrEqual(150);
  });
  it("validates offsets after HTML normalisation and rejects corrupted labels and real ids", () => {
    const { patient } = fixture();
    patient.documents[0].text = patient.documents[0].text.replaceAll("\n", "<BR>");
    expect(() => validatePatient(patient)).not.toThrow();
    patient.labels.facts[0].start++;
    expect(() => validatePatient(patient)).toThrow("invalid label span");
    patient.patient.id = "patient-0000-0001";
    expect(() => validatePatient(patient)).toThrow("Only synthetic");
  });
});

describe("synthetic correctness and citations", () => {
  it("accepts located visible fact matches without calling a judge", async () => {
    const { question, screen, evidence } = fixture();
    const result = await scoreQuestion(question, screen, evidence, async () => {
      throw new Error("Judge must not run");
    });
    expect(result.pass).toBe(true);
    expect(result.method).toBe("deterministic");
  });
  it("does not infer missing visible values from underlying cited facts", async () => {
    const { question, screen, evidence, card } = fixture();
    card.lines[0].text = "HbA1c measured";
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
  });
  it("fails a right answer cited from the wrong document or the wrong span", async () => {
    const { question, screen, evidence } = fixture();
    question.expected = [{ ...question.expected[0], documentId: "different" }];
    expect((await scoreQuestion(question, screen, evidence)).citation).toBe(false);
    question.expected = [{ ...question.expected[0], documentId: "doc", start: 200, end: 210 }];
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
  });
  it("fails negation and timing mismatches even when fact ids match", async () => {
    const { question, screen, evidence } = fixture();
    question.expected = [{ ...question.expected[0], assertion: "negated" }];
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
    question.expected = [
      { ...question.expected[0], assertion: "present", temporalStatus: "planned" },
    ];
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
  });
  it("fails changed numeric fields even when ids and labels match", async () => {
    const { question, screen, evidence } = fixture();
    question.expected = [{ ...question.expected[0], attrs: { value: "9.1", unit: "percent" } }];
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
  });
  it("rejects a gap when a fact label explicitly documents that need", () => {
    const { patient, screen, card } = fixture();
    card.availability = "not_documented";
    card.lines = [{ ...card.lines[0], kind: "absence", factIds: [], segmentIds: [] }];
    card.searched = { asOf: screen.window.asOf, eligible: 1, total: 1 };
    const result = scoreAvailability(screen, patient.labels.gaps, patient.labels.facts);
    expect(result.pass).toBe(false);
    expect(result.failures).toContain("hba1c: documented fact rendered as gap");
  });
  it("uses fallback only for semantically ambiguous facts with an expected located citation", async () => {
    const { question, screen, evidence } = fixture();
    question.expected = [{ ...question.expected[0], id: "label", labelEn: "Glycated haemoglobin" }];
    let calls = 0;
    const result = await scoreQuestion(question, screen, evidence, async () => {
      calls++;
      return { pass: true, reason: "Equivalent" };
    });
    expect(calls).toBe(1);
    expect(result.method).toBe("llm");
    expect(result.pass).toBe(true);
  });
  it("requires a supported full-window absence claim and never passes unavailable", async () => {
    const { screen, evidence, card } = fixture();
    const question: Question = {
      id: "gap",
      type: "gap",
      text: "Renal function?",
      needId: "kidney_function",
      concept: "Renal function",
    };
    card.needId = question.needId;
    card.availability = "unavailable";
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
    card.availability = "not_documented";
    card.lines[0].kind = "absence";
    card.lines[0].factIds = [];
    card.lines[0].segmentIds = [];
    card.searched = { asOf: screen.window.asOf, eligible: 1, total: 1 };
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(true);
    card.searched.eligible = 0;
    expect((await scoreQuestion(question, screen, evidence)).pass).toBe(false);
  });
  it("fails traceability on corrupt source offsets even when the answer matches", async () => {
    const { patient, screen, evidence, question } = fixture();
    evidence.facts[0].start++;
    const challenge = generateChallenges([patient], 3)[0];
    challenge.questions[0] = question;
    const scores = await scoreScreen(
      challenge,
      screen,
      evidence,
      patient.labels.gaps,
      patient.labels.facts,
    );
    expect(scores.traceability.pass).toBe(false);
    expect(scores.pass).toBe(false);
  });
});

describe("synthetic finding adjudication scores", () => {
  it("matches passage spans and subtracts duplicate and distractor false alarms", () => {
    const { screen } = fixture();
    const passages = [
      {
        documentId: "a",
        segmentId: "a-s0",
        factId: null,
        quote: "left",
        start: 0,
        end: 4,
        claimEn: "left",
      },
      {
        documentId: "b",
        segmentId: "b-s0",
        factId: null,
        quote: "right",
        start: 0,
        end: 5,
        claimEn: "right",
      },
    ];
    const finding: Finding = {
      id: "engine-id",
      type: "contradiction",
      title: "Side mismatch",
      explanation: "Two sides",
      severity: "high",
      computation: null,
      hypothesisText: null,
      passages,
    };
    const label = {
      id: "label-id",
      category: "side",
      severity: "high",
      explanation: "Two sides",
      passages,
    };
    screen.findings = [finding];
    expect(scoreContradictions(screen, [label], []).net).toBe(1);
    screen.findings.push({ ...finding, id: "duplicate" });
    expect(scoreContradictions(screen, [label], []).falseAlarms).toBe(1);
    screen.findings.pop();
    const distraction = {
      id: "change",
      passages: passages.map((p) => ({ ...p, documentId: `other-${p.documentId}` })),
    };
    screen.findings.push({ ...finding, id: "false", passages: distraction.passages });
    const scores = scoreContradictions(screen, [label], [distraction]);
    expect(scores.truePositives).toBe(1);
    expect(scores.falseAlarms).toBe(1);
    expect(scores.net).toBe(0);
    expect(scores.distractorIds).toEqual(["change"]);
  });
});
