import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { locatedUiFacts, type UiToolOutputs, UiToolSchemas, uiTools } from "../agent/ui-tools.ts";
import type { Claim, EvidenceWindow, Fact, Segment } from "../contracts.ts";
import { CHIPS } from "../lens/needs/profiles.ts";
import { factLineText, trendLines } from "../lens/templates.ts";
import { evidenceWindow, loadFacts, loadSegments, PATIENT_ID } from "../store.ts";

const options = { toolCallId: "gen-ui-db-test", messages: [], context: {} };
let window: EvidenceWindow;
let facts: Fact[];
let segments: Segment[];
let tools: ReturnType<typeof uiTools>;

function checkOutput<K extends keyof UiToolOutputs>(name: K, output: unknown): UiToolOutputs[K] {
  expect(UiToolSchemas[name].safeParse(output).success).toBe(true);
  return UiToolSchemas[name].parse(output) as UiToolOutputs[K];
}

function checkedClaim(claim: Claim, allowFixedLetterText = false) {
  expect(["supported", "exempt"].includes(claim.validation.support)).toBe(true);
  expect(claim.validation.key.length > 0).toBe(true);
  expect(claim.segmentIds.every((id) => segments.some((segment) => segment.id === id))).toBe(true);
  expect(claim.factIds.every((id) => facts.some((fact) => fact.id === id))).toBe(true);
  if (allowFixedLetterText || claim.kind === "absence" || claim.kind === "boilerplate") return;
  expect(claim.kind === "template").toBe(true);
  const cited = facts.filter((fact) => claim.factIds.includes(fact.id));
  const templates = [
    ...cited.map(factLineText),
    ...trendLines(cited, { patientId: PATIENT_ID, window }).map((line) => line.text),
  ];
  expect(templates.includes(claim.text)).toBe(true);
}

describe.skipIf(!process.env.DATABASE_URL)("UI tools against the live evidence window", () => {
  beforeAll(async () => {
    window = await evidenceWindow();
    const [storedFacts, storedSegments] = await Promise.all([
      loadFacts(window),
      loadSegments(window),
    ]);
    segments = storedSegments;
    facts = locatedUiFacts(storedFacts, segments);
    tools = uiTools({ patientId: PATIENT_ID, window, sessionId: `gen-ui-test-${randomUUID()}` });
  }, 60_000);

  it("validates the patient summary and every template claim", async () => {
    const output = checkOutput(
      "show_patient_summary",
      await tools.show_patient_summary.execute({}, options),
    );
    for (const row of [...output.demographics, ...output.criticalFacts]) checkedClaim(row.line);
    expect(output.documentCount).toBe(window.eligibleDocumentIds.length);
  }, 60_000);

  it("validates medication lists and retains source labels", async () => {
    const output = checkOutput(
      "show_medications",
      await tools.show_medications.execute({ list: "all" }, options),
    );
    for (const list of output.lists) {
      expect(/current medication/i.test(list.listLabel)).toBe(false);
      expect(window.eligibleDocumentIds.includes(list.documentId)).toBe(true);
      for (const row of list.lines) checkedClaim(row.line);
    }
    for (const change of output.changes) {
      checkedClaim(change.from.line);
      checkedClaim(change.to.line);
    }
  }, 60_000);

  it("validates lab points and their located provenance", async () => {
    const output = checkOutput(
      "show_lab_trend",
      await tools.show_lab_trend.execute({ measure: "weight" }, options),
    );
    for (const point of output.points) {
      checkedClaim(point.line);
      expect(
        facts.some(
          (fact) =>
            fact.id === point.factId &&
            fact.segmentId === point.segmentId &&
            fact.quote === point.quote,
        ),
      ).toBe(true);
    }
    if (output.deltaLine) checkedClaim(output.deltaLine);
  }, 60_000);

  it("validates dated timeline templates", async () => {
    const output = checkOutput(
      "show_timeline",
      await tools.show_timeline.execute({ kinds: ["procedure", "event"] }, options),
    );
    for (const event of output.events) checkedClaim(event.line);
  }, 60_000);

  it("validates adjudicated findings and each quoted passage", async () => {
    const output = checkOutput("show_findings", await tools.show_findings.execute({}, options));
    for (const finding of output.findings) {
      expect(["contradiction", "needs_clarification"].includes(finding.type)).toBe(true);
      for (const passage of finding.passages) {
        const source = segments.find((segment) => segment.id === passage.segmentId);
        expect(Boolean(source?.text.includes(passage.quote))).toBe(true);
      }
    }
  }, 120_000);

  it("validates passage navigation and rejects an unknown source", async () => {
    expect(segments.length > 0).toBe(true);
    const output = checkOutput(
      "show_passage",
      await tools.show_passage.execute({ segmentId: segments[0].id }, options),
    );
    expect(window.eligibleDocumentIds.includes(output.document.id)).toBe(true);
    await expect(
      tools.show_passage.execute({ segmentId: "synthetic-unknown-source" }, options),
    ).rejects.toThrow();
  }, 60_000);

  it("validates the absence result without manufacturing a gap on failure", async () => {
    const output = checkOutput(
      "check_documented",
      await tools.check_documented.execute({ concept: "kidney function" }, options),
    );
    expect(output.searched.asOf).toBe(window.asOf);
    expect(output.searched.eligible).toBe(window.eligibleDocumentIds.length);
    if (output.status === "not_documented") expect(output.segmentIds).toEqual([]);
    if (output.status === "unavailable") expect(output.segmentIds).toEqual([]);
  }, 60_000);

  it("validates a collected lens stream with only template or checked absence lines", async () => {
    const chip = CHIPS[0];
    const output = checkOutput(
      "open_lens",
      await tools.open_lens.execute({ text: chip.text, chipId: chip.id }, options),
    );
    expect(output.situation.asOf).toBe(window.asOf);
    for (const section of output.sections)
      for (const card of section.cards) {
        expect(card.headline === undefined).toBe(true);
        for (const line of card.lines) checkedClaim(line);
      }
  }, 180_000);

  it("validates the GP letter from the existing shared claim boundary", async () => {
    const output = checkOutput("draft_letter", await tools.draft_letter.execute({}, options));
    expect(output.asOf).toBe(window.asOf);
    for (const section of output.sections)
      for (const claim of section.claims) checkedClaim(claim, true);
  }, 180_000);
});
