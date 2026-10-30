import { existsSync } from "node:fs";
import path from "node:path";
import type { Document, Fact, Finding, LensEvent, Screen, Segment } from "@medlyn/engine/contracts";
import { mockLensEvents } from "@medlyn/engine/lens/mock";
import { describe, expect, it } from "../../packages/engine/node_modules/vitest/dist/index.js";
import { required } from "../../packages/engine/required.ts";
import {
  checkAvailability,
  checkCitation,
  checkComposed,
  checkTraceability,
  type Evidence,
} from "../assertions/evidence.ts";
import {
  type FindingFixture,
  findingFixtures,
  fixtureMatches,
  overlaps,
  scoreFindings,
} from "../assertions/fixtures.ts";
import { answeringCardIds } from "../assertions/rubrics.ts";
import { loadHeldout, loadRegression, parseSituations, repoRoot } from "../data.ts";
import MedlynProvider from "../provider.ts";
import { collectScreen, readJsonLines, visibleText } from "../screen.ts";

async function* events(values: unknown[]) {
  for (const value of values) yield structuredClone(value);
}
async function screen(): Promise<Screen> {
  return collectScreen(events(mockLensEvents));
}
async function located() {
  const result = await screen();
  const text = "alpha 10 beta";
  const document: Document & {
    normText: string;
  } = {
    id: "synthetic-doc",
    patientId: result.patient.id,
    revisionId: "synthetic-rev",
    title: "Synthetic",
    titleEn: "Synthetic",
    docType: "synthetic",
    docDate: "2016-04-15",
    department: "test",
    normText: text,
  };
  const segment: Segment = {
    id: "synthetic-segment",
    documentId: document.id,
    kind: "sentence",
    section: null,
    start: 0,
    end: text.length,
    text,
    textEn: null,
  };
  const fact: Fact = {
    id: "synthetic-fact",
    segmentId: segment.id,
    documentId: document.id,
    kind: "measurement",
    labelEn: "Synthetic measurement",
    attrs: {},
    assertion: "present",
    temporalStatus: "stated",
    eventDate: null,
    datePrecision: null,
    dueDate: null,
    docDate: document.docDate,
    quote: "10",
    start: 6,
    end: 8,
    entityId: null,
    locationOk: true,
    support: "supported",
    negationFlag: false,
    contentHash: "synthetic",
    validatorVersion: "synthetic",
  };
  const card = structuredClone(
    required(result.sections.flatMap((s) => s.cards).find((c) => c.lines.length)),
  );
  card.id = "synthetic-card";
  card.headline = undefined;
  card.review = undefined;
  card.availability = "documented";
  card.lines = [
    { ...card.lines[0], id: "synthetic-claim", factIds: [fact.id], segmentIds: [segment.id] },
  ];
  result.sections = [{ id: "synthetic-section", title: "Synthetic", cards: [card] }];
  result.findings = [];
  result.openQuestions = [];
  result.window = {
    asOf: "2016-04-15",
    corpusRevision: document.revisionId,
    eligibleDocumentIds: [document.id],
  };
  const evidence: Evidence = { documents: [document], segments: [segment], facts: [fact] };
  return { screen: result, evidence, card, fact, segment, document };
}
function finding(fixture: FindingFixture, type: Finding["type"] = "contradiction"): Finding {
  return {
    id: `test-${fixture.id}`,
    type,
    title: "Synthetic",
    explanation: "Synthetic",
    severity: "low",
    computation: null,
    hypothesisText: null,
    passages: fixture.anchors.map((anchor, index) => ({
      ...anchor,
      segmentId: `synthetic-${index}`,
      factId: null,
      quote: "Synthetic",
      claimEn: "Synthetic",
    })),
  };
}
describe("event collection", () => {
  it("collects the mock contract and only renders its visible material", async () => {
    const result = await screen();
    expect(result.timings.totalMs).toBeGreaterThan(0);
    expect(visibleText(result)).toContain("[card:");
    expect(result.sections.flatMap((s) => s.cards).length).toBeGreaterThan(0);
  });
  it("rejects incomplete, out-of-order and failed streams", async () => {
    await expect(
      collectScreen(events(mockLensEvents.filter((e) => e.type !== "done"))),
    ).rejects.toThrow("complete screen");
    await expect(
      collectScreen(events([mockLensEvents.find((e) => e.type === "section")])),
    ).rejects.toThrow("before situation");
    await expect(
      collectScreen(events([{ type: "error", message: "Synthetic failure", retryable: true }])),
    ).rejects.toThrow("Synthetic failure");
  });
  it("rejects session reviews", async () => {
    const altered = structuredClone(mockLensEvents);
    const section = required(
      altered.find(
        (
          e,
        ): e is Extract<
          LensEvent,
          {
            type: "section";
          }
        > => e.type === "section",
      ),
    );
    section.section.cards[0].review = { action: "accepted", at: "synthetic" };
    await expect(collectScreen(events(altered))).rejects.toThrow("empty review layer");
  });
  it("rejects unknown headline references and events after completion", async () => {
    const first = required(mockLensEvents.find((e) => e.type === "situation"));
    const done = required(mockLensEvents.find((e) => e.type === "done"));
    const headline = structuredClone(mockLensEvents.find((e) => e.type === "headline")) as Extract<
      LensEvent,
      {
        type: "headline";
      }
    >;
    headline.cardId = "missing";
    await expect(collectScreen(events([first, headline, done]))).rejects.toThrow("missing card");
    await expect(collectScreen(events([first, done, done]))).rejects.toThrow("after done");
  });
  it("rejects done when an advertised section never arrived", async () => {
    const header = required(mockLensEvents.find((e) => e.type === "situation"));
    const done = required(mockLensEvents.find((e) => e.type === "done"));
    await expect(collectScreen(events([header, done]))).rejects.toThrow(
      "missing advertised sections",
    );
  });
  it("excludes claims hidden by the shared claim boundary from visible text", async () => {
    const result = await screen();
    const card = required(
      result.sections
        .flatMap((s) => s.cards)
        .find((c) => c.availability === "documented" && c.lines.length),
    );
    card.lines[0].text = "Synthetic unsupported text";
    card.lines[0].validation.support = "unsupported";
    expect(visibleText(result)).not.toContain("Synthetic unsupported text");
  });
  it("decodes split UTF-8 NDJSON and an unterminated final line", async () => {
    const bytes = new TextEncoder().encode('{"text":"µg"}\n{"done":true}');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    });
    const values: unknown[] = [];
    for await (const event of readJsonLines(body)) values.push(event);
    expect(values).toEqual([{ text: "µg" }, { done: true }]);
  });
});
describe("quote and citation checks", () => {
  it("requires exact normalised document offsets and the cited segment", async () => {
    const sample = await located();
    expect(checkTraceability(sample.screen, sample.evidence).pass).toBe(true);
    sample.fact.start++;
    expect(checkTraceability(sample.screen, sample.evidence).pass).toBe(false);
  });
  it("rejects missing facts, ineligible documents and missing segment links", async () => {
    const sample = await located();
    expect(checkTraceability(sample.screen, { ...sample.evidence, facts: [] }).pass).toBe(false);
    sample.screen.window.eligibleDocumentIds = [];
    expect(checkTraceability(sample.screen, sample.evidence).pass).toBe(false);
    sample.screen.window.eligibleDocumentIds = [sample.document.id];
    sample.card.lines[0].segmentIds = [];
    expect(checkTraceability(sample.screen, sample.evidence).pass).toBe(false);
  });
  it("rechecks composed claims in an isolated validator and rejects unsupported tokens", async () => {
    const sample = await located();
    sample.card.headline = {
      ...sample.card.lines[0],
      id: "synthetic-headline",
      kind: "composed",
      text: "Synthetic measurement 999999",
    };
    const result = await checkComposed(sample.screen, sample.evidence);
    expect(result.checked).toBe(1);
    expect(result.pass).toBe(false);
    expect(result.failures[0]).toContain("synthetic-headline");
  }, 30000);
  it("requires citations on answering cards rather than unrelated cards", async () => {
    const sample = await located();
    expect(
      checkCitation(sample.screen, sample.evidence, [sample.document.id], [sample.card.id]).pass,
    ).toBe(true);
    expect(
      checkCitation(sample.screen, sample.evidence, [sample.document.id], ["different-card"]).pass,
    ).toBe(false);
    expect(checkCitation(sample.screen, sample.evidence, ["different-document"]).pass).toBe(false);
    expect(checkCitation(sample.screen, sample.evidence, []).pass).toBe(true);
  });
  it("does not accept unavailable as absence or an unproved gap", async () => {
    const sample = await located();
    sample.card.availability = "unavailable";
    expect(checkAvailability(sample.screen).pass).toBe(false);
    sample.card.availability = "not_documented";
    sample.card.searched = { eligible: 1, total: 1, asOf: sample.screen.window.asOf };
    expect(checkAvailability(sample.screen).pass).toBe(false);
    sample.card.lines = [
      {
        ...sample.card.lines[0],
        kind: "absence",
        validation: { key: "synthetic", support: "supported" },
      },
    ];
    expect(checkAvailability(sample.screen).pass).toBe(true);
  });
});
describe("finding fixtures", () => {
  it("requires all passage anchors and keeps clarification separate", () => {
    const c1 = required(findingFixtures.find((f) => f.id === "C1"));
    expect(fixtureMatches(finding(c1), c1)).toBe(true);
    expect(fixtureMatches({ ...finding(c1), passages: finding(c1).passages.slice(0, 1) }, c1)).toBe(
      false,
    );
    const d1 = required(findingFixtures.find((f) => f.id === "D1"));
    const result = scoreFindings([finding(c1), finding(d1, "needs_clarification")]);
    expect(result.contradictions).toBe(1);
    expect(result.matched.find((f) => f.id === "D1")?.found).toBe(true);
  });
  it("subtracts dismissed changes and misclassified clarification from net", () => {
    const dismissal = required(findingFixtures.find((f) => f.id === "X-candesartan"));
    const d1 = required(findingFixtures.find((f) => f.id === "D1"));
    expect(scoreFindings([finding(dismissal), finding(d1)]).falseAlarmIds).toHaveLength(2);
    expect(
      overlaps({ documentId: "x", start: 0, end: 5 }, { documentId: "x", start: 5, end: 8 }),
    ).toBe(false);
  });
});
describe("corpus and provider", () => {
  it("keeps twenty held-out situations across the declared tiers", async () => {
    const heldout = await loadHeldout();
    expect([1, 2, 3].map((tier) => heldout.filter((s) => s.tier === tier).length)).toEqual([
      6, 7, 7,
    ]);
  });
  it("rejects malformed regression corpora", () => {
    expect(() => parseSituations("## 1. Synthetic\nDescription\n1. Question", [])).toThrow(
      "five situations",
    );
  });
  it.skipIf(
    !process.env.MEDLYN_DATA_PATH ||
      !existsSync(path.resolve(repoRoot, process.env.MEDLYN_DATA_PATH)),
  )("loads all fifteen runtime regression questions", async () => {
    const situations = await loadRegression();
    expect(situations).toHaveLength(5);
    expect(situations.flatMap((s) => s.questions)).toHaveLength(15);
  });
  it("parses only explicit valid judge card IDs", () => {
    expect(answeringCardIds('Evidence. CARD_IDS=["c1","c2"]')).toEqual(["c1", "c2"]);
    expect(answeringCardIds("No card was identified")).toEqual([]);
    expect(answeringCardIds("CARD_IDS=[42]")).toEqual([]);
  });
  it("runs the provider with mock evidence labelled as mock", async () => {
    const provider = new MedlynProvider({ config: { mock: true } });
    const response = await provider.callApi("Synthetic situation");
    expect(response.error).toBeUndefined();
    expect(response.metadata?.mock).toBe(true);
    expect(response.output).toContain("[card:");
    const capture = await provider.capture("Synthetic situation");
    expect(capture).toBe(response.metadata);
  });
});
