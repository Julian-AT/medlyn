import { describe, expect, it } from "vitest";
import {
  type Fact,
  LensEvent,
  type Need,
  type Screen,
  Screen as ScreenSchema,
} from "../contracts.ts";
import { lensCacheKey } from "../lens/cache.ts";
import { parseArgs } from "../lens/cli.ts";
import { CHIPS, CRITICAL_NEED_IDS } from "../lens/needs/profiles.ts";
import { parseSituation } from "../lens/parse.ts";
import { absenceConcept, completionCandidates, followupNeeds, plan } from "../lens/plan.ts";
import { cardFindings, renderCard } from "../lens/render.ts";
import { openQuestions, screenEvents, screenFromEvents } from "../lens/screen.ts";
import { validateSelections } from "../lens/select.ts";
import { asCompleted } from "../lens/stream.ts";
import { required } from "../required.ts";

const window = { asOf: "2020-01-01", eligibleDocumentIds: ["d"], corpusRevision: "r1" };
const need: Need = {
  id: "test",
  title: "Synthetic need",
  why: "Test",
  kinds: ["measurement"],
  cardType: "facts",
  critical: false,
  synonyms: [],
  requiredFields: ["value"],
};
const fact: Fact = {
  id: "f1",
  segmentId: "d-s0",
  documentId: "d",
  kind: "measurement",
  labelEn: "Marker alpha",
  attrs: { value: 7 },
  assertion: "negated",
  temporalStatus: "planned",
  eventDate: null,
  datePrecision: null,
  dueDate: null,
  docDate: "2020-01-01",
  quote: "Marker alpha 7",
  start: 0,
  end: 14,
  entityId: null,
  locationOk: true,
  support: "supported",
  negationFlag: false,
  contentHash: "hash1",
  validatorVersion: "v1",
};
const selection = () => ({
  needId: "test",
  factIds: ["f1"],
  completeness: "complete" as const,
  missing: [] as string[],
  headline: null as {
    text: string;
    factIds: string[];
  } | null,
});
const screen: Screen = {
  lensKey: "key",
  patient: {
    id: "p",
    displayName: "Synthetic",
    sex: "X",
    birthDate: "2000-01-01",
    birthDateQuote: "",
    birthDateSegmentId: null,
  },
  situation: {
    role: "Synthetic",
    task: "Test",
    asOf: window.asOf,
    concerns: [],
    profileId: null,
    tier: 3,
  },
  window,
  critical: ["card"],
  sections: [
    {
      id: "section",
      title: "Test",
      cards: [
        {
          id: "card",
          needId: "test",
          title: "Synthetic",
          why: "Test",
          cardType: "facts",
          critical: true,
          availability: "documented",
          completeness: "partial",
          conflict: "none",
          findingIds: [],
          lines: [],
          headline: {
            id: "h",
            kind: "composed",
            text: "Synthetic",
            factIds: ["f1"],
            segmentIds: ["d-s0"],
            author: "machine",
            validation: { key: "hk", support: "supported" },
          },
        },
      ],
    },
  ],
  findings: [],
  openQuestions: [],
  timings: { planMs: 1, firstSectionMs: 2, totalMs: 3, cached: false },
};
describe("lens planning and selection", () => {
  it("parses every chip without a model and preserves an explicit as-of date", async () => {
    for (const chip of CHIPS) {
      const parsed = await parseSituation(chip.text, window.asOf, chip.id);
      expect(parsed).toEqual({ ...chip.situation, asOf: window.asOf });
      const planned = await plan(parsed);
      expect(planned.tier).toBe(1);
      const ids = planned.sections.flatMap((section) => section.needs.map((need) => need.id));
      expect(ids).toEqual(expect.arrayContaining(CRITICAL_NEED_IDS));
    }
  });
  it("rejects unknown chips before attempting a model or database call", async () => {
    await expect(parseSituation("test", window.asOf, "unknown")).rejects.toThrow(
      "Unknown situation chip",
    );
  });
  it("adds concern needs and reports a new combination as tier two", async () => {
    const planned = await plan({ ...CHIPS[1].situation, concerns: ["creatinine"] });
    expect(planned.sections.flatMap((section) => section.needs.map((need) => need.id))).toContain(
      "kidney_function",
    );
    expect(planned.tier).toBe(2);
  });
  it("rejects unknown or duplicate needs and drops facts outside the eligible input", () => {
    expect(() =>
      validateSelections({ needs: [{ ...selection(), needId: "invented" }] }, [need], [fact]),
    ).toThrow();
    expect(() =>
      validateSelections({ needs: [selection(), selection()] }, [need], [fact]),
    ).toThrow();
    const rejected = validateSelections(
      { needs: [{ ...selection(), factIds: ["later", "f1"] }] },
      [need],
      [fact],
    )[0];
    expect(rejected.factIds).toEqual(["f1"]);
    expect(rejected.completeness).toBe("partial");
    expect(
      validateSelections({ needs: [selection()] }, [need], [{ ...fact, kind: "allergy" }])[0]
        .factIds,
    ).toEqual([]);
  });
  it("keeps negated and future-planned facts eligible and ignores ungrounded headlines", () => {
    const output = selection();
    output.headline = { text: "Synthetic", factIds: ["f1"] };
    expect(validateSelections({ needs: [output] }, [need], [fact])[0].factIds).toEqual(["f1"]);
    output.headline = {
      text: "one two three four five six seven eight nine ten eleven twelve thirteen",
      factIds: ["f1"],
    };
    expect(validateSelections({ needs: [output] }, [need], [fact])[0].headline).toBeNull();
  });
  it("accepts evidence from any relevant kind supplied to the section", () => {
    const second = { ...need, id: "procedure_context", kinds: ["procedure" as const] };
    const procedure = { ...fact, kind: "procedure" as const };
    expect(
      validateSelections({ needs: [selection()] }, [need, second], [procedure])[0].factIds,
    ).toEqual(["f1"]);
  });
  it("marks omitted needs and selected needs with missing fields partial", () => {
    expect(validateSelections({ needs: [] }, [need], [fact])[0].completeness).toBe("partial");
    expect(
      validateSelections({ needs: [{ ...selection(), missing: ["value"] }] }, [need], [fact])[0]
        .completeness,
    ).toBe("partial");
  });
  it("derives completion needs from recommendations and excludes baseline or merely planned evidence", () => {
    const recommendation = {
      ...fact,
      id: "rec",
      kind: "recommendation" as const,
      labelEn: "Synthetic carotid follow-up",
      temporalStatus: "recommended" as const,
    };
    const section = {
      id: "followups",
      title: "Follow-ups",
      needs: [{ ...need, id: "open_followups" }],
    };
    const [completion] = followupNeeds(section, [recommendation]);
    expect(completion.id).toBe("completion_carotid_duplex");
    const done = { ...fact, id: "done", docDate: "2020-02-01", temporalStatus: "done" as const };
    const laterPlan = { ...done, id: "plan", temporalStatus: "planned" as const };
    expect(
      completionCandidates(completion, [fact, done, laterPlan]).map((item) => item.id),
    ).toEqual(["done"]);
    expect(absenceConcept(completion)).toContain("Documented completion AFTER 2020-01-01 of:");
    expect(followupNeeds(section, [])).toEqual([]);
  });
  it("checks renal absence separately when other contrast-risk evidence is present", async () => {
    const emergency = required(CHIPS.find((chip) => chip.profileId === "emergency_dizziness"));
    const planned = await plan(emergency.situation);
    const contrast = planned.sections.find((section) =>
      section.needs.some((need) => need.id === "contrast_risks"),
    );
    expect(contrast?.needs.map((need) => need.id)).toContain("kidney_function");
    expect(contrast?.needs.find((need) => need.id === "contrast_risks")?.requiredFields).toContain(
      "prior_contrast_avoidance",
    );
  });
  it("plans the scheduled procedure separately from a tumour-board meeting date", async () => {
    const surgery = required(CHIPS.find((chip) => chip.profileId === "surgery_tumour_board"));
    const planned = await plan(surgery.situation);
    const board = planned.sections.find((section) =>
      section.needs.some((need) => need.id === "tumour_board"),
    );
    expect(board?.needs.map((need) => need.id)).toContain("procedure_date");
  });
  it("checks for a later HbA1c separately from rendering the latest extracted value", () => {
    const section = { id: "hba1c", title: "HbA1c", needs: [{ ...need, id: "hba1c" }] };
    const measured = {
      ...fact,
      kind: "lab" as const,
      labelEn: "HbA1c",
      assertion: "present" as const,
      temporalStatus: "stated" as const,
    };
    const [later] = followupNeeds(section, [
      measured,
      { ...measured, id: "later-plan", docDate: "2021-01-01", temporalStatus: "planned" },
    ]);
    expect(later.id).toBe("completion_later_hba1c");
    expect(later.afterDocumentDate).toBe(fact.docDate);
    expect(absenceConcept(later)).toContain("Later HbA1c measurement");
  });
});
describe("card rendering at the claim boundary", () => {
  const segment = {
    id: "d-s0",
    documentId: "d",
    kind: "sentence" as const,
    section: null,
    start: 0,
    end: 14,
    text: fact.quote,
    textEn: null,
  };
  const ctx = { window, facts: [fact], segments: [segment], findings: [] };
  it("keeps assertion, temporal status, availability and completeness independent", async () => {
    const { card } = await renderCard(
      need,
      { ...selection(), completeness: "partial", missing: ["date"] },
      ctx,
    );
    expect(card.availability).toBe("documented");
    expect(card.completeness).toBe("partial");
    expect(card.lines[0].assertion).toBe("negated");
    expect(card.lines[0].temporalStatus).toBe("planned");
    expect(card.review).toBeUndefined();
  });
  it("renders a gap only with a matching successful full-window absence result", async () => {
    const absent = {
      status: "not_documented" as const,
      concept: need.title,
      searched: { eligible: 1, total: 2, asOf: window.asOf },
      segmentIds: [],
    };
    const empty = { ...selection(), factIds: [] };
    const { card } = await renderCard(need, empty, ctx, absent);
    expect(card.availability).toBe("not_documented");
    expect(card.cardType).toBe("gap");
    expect(card.lines[0].kind).toBe("absence");
    expect(card.lines[0].validation.support).toBe("supported");
    const unavailable = await renderCard(need, empty, ctx, { ...absent, status: "unavailable" });
    expect(unavailable.card.availability).toBe("unavailable");
    expect(unavailable.card.lines).toEqual([]);
  });
  it("fails closed on unsupported selected facts without converting them into an absence", async () => {
    const result = await renderCard(need, selection(), {
      ...ctx,
      facts: [{ ...fact, support: "unsupported" }],
    });
    expect(result.card.availability).toBe("unavailable");
    expect(result.card.lines).toEqual([]);
  });
  it("shows unavailable when a passage hit has no extracted renderable fact", async () => {
    const result = await renderCard(need, { ...selection(), factIds: [] }, ctx, {
      status: "documented",
      concept: need.title,
      searched: { eligible: 1, total: 1, asOf: window.asOf },
      segmentIds: ["d-s0"],
    });
    expect(result.card.availability).toBe("unavailable");
    expect(result.card.lines).toEqual([]);
    expect(
      openQuestions([{ id: "section", title: "Test", cards: [result.card] }], []),
    ).toHaveLength(1);
  });
  it("validates qualified completion absence through the shared boundary", async () => {
    const [completion] = followupNeeds(
      { id: "followups", title: "Follow-ups", needs: [{ ...need, id: "open_followups" }] },
      [
        {
          ...fact,
          kind: "procedure",
          labelEn: "Synthetic carotid follow-up",
          temporalStatus: "planned",
        },
      ],
    );
    const proof = {
      status: "not_documented" as const,
      concept: absenceConcept(completion),
      searched: { eligible: 1, total: 1, asOf: window.asOf },
      segmentIds: [],
    };
    const { card } = await renderCard(
      completion,
      { ...selection(), needId: completion.id, factIds: [] },
      ctx,
      proof,
    );
    expect(card.availability).toBe("not_documented");
    expect(card.lines[0].validation.support).toBe("supported");
    expect(card.lines[0].text).toContain("no record of completion");
  });
});
describe("cache, evidence and stream assembly", () => {
  it("changes the key for corpus, window, situation, fact content or segment identity changes", () => {
    const key = lensCacheKey(screen.situation, window, [fact], []);
    expect(
      lensCacheKey(screen.situation, { ...window, corpusRevision: "r2" }, [fact], []),
    ).not.toBe(key);
    expect(
      lensCacheKey(screen.situation, { ...window, eligibleDocumentIds: [] }, [fact], []),
    ).not.toBe(key);
    expect(lensCacheKey({ ...screen.situation, task: "Another" }, window, [fact], [])).not.toBe(
      key,
    );
    expect(
      lensCacheKey(screen.situation, window, [{ ...fact, contentHash: "hash2" }], []),
    ).not.toBe(key);
    expect(
      lensCacheKey(
        screen.situation,
        window,
        [fact],
        [
          {
            id: "s",
            documentId: "d",
            kind: "sentence",
            section: null,
            start: 0,
            end: 1,
            text: "x",
            textEn: null,
          },
        ],
      ),
    ).not.toBe(key);
  });
  it("round trips the frozen screen contract with sections before headlines", () => {
    const events = screenEvents(screen);
    expect(events.map((event) => LensEvent.parse(event).type)).toEqual([
      "situation",
      "section",
      "headline",
      "findings",
      "done",
    ]);
    expect(screenFromEvents(events)).toEqual(ScreenSchema.parse(screen));
    expect(() => screenFromEvents(events.slice(0, -1))).toThrow("Incomplete");
  });
  it("generates open questions for unavailable and absent cards independently of completeness", () => {
    const cards = screen.sections[0].cards;
    expect(
      openQuestions(
        [
          {
            ...screen.sections[0],
            cards: [
              { ...cards[0], availability: "not_documented" },
              { ...cards[0], id: "unavailable", availability: "unavailable" },
              { ...cards[0], id: "documented", completeness: "partial" },
            ],
          },
        ],
        [],
      ),
    ).toHaveLength(2);
  });
  it("attaches findings by cited fact or segment, without mixing unrelated findings", () => {
    const finding = {
      id: "finding",
      type: "contradiction" as const,
      title: "Synthetic",
      explanation: "Test",
      severity: "high" as const,
      computation: null,
      hypothesisText: null,
      passages: [
        {
          segmentId: "d-s0",
          documentId: "d",
          factId: null,
          quote: "Synthetic",
          start: 0,
          end: 9,
          claimEn: "Synthetic",
        },
      ],
    };
    expect(cardFindings([fact], [], [finding])).toEqual([finding]);
    expect(cardFindings([], [], [finding])).toEqual([]);
  });
  it("yields sections by completion and retains simultaneous completions", async () => {
    const values: number[] = [];
    const slow = new Promise<number>((resolve) => setTimeout(() => resolve(1), 15));
    for await (const value of asCompleted([slow, Promise.resolve(2), Promise.resolve(3)]))
      values.push(value);
    expect(values).toEqual([2, 3, 1]);
  });
  it("accepts chip-only CLI calls and rejects malformed options", () => {
    expect(parseArgs(["--chip", CHIPS[0].id, "--no-cache"])).toMatchObject({
      text: CHIPS[0].text,
      noCache: true,
    });
    expect(() => parseArgs(["--chip"])).toThrow("Missing value");
    expect(() => parseArgs(["--unknown"])).toThrow("Unknown option");
  });
});
