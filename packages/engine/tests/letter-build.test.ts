import { describe, expect, it } from "vitest";
import { validateClaims } from "../claims/validate.ts";
import type { AbsenceResult, Fact, Finding, Segment } from "../contracts.ts";
import { assembleLetter, type LetterContext, stayDateClaim } from "../letter/build.ts";
import { required } from "../required.ts";

function fact(
  id: string,
  kind: Fact["kind"],
  labelEn: string,
  documentId = "12340012",
  attrs: Record<string, unknown> = {},
): Fact {
  return {
    id,
    segmentId: `${id}-segment`,
    documentId,
    kind,
    labelEn,
    attrs,
    assertion: "present",
    temporalStatus: kind === "recommendation" ? "recommended" : "stated",
    eventDate: null,
    datePrecision: null,
    dueDate: null,
    docDate: documentId === "12340012" ? "2015-06-22" : "2016-04-15",
    quote: "Synthetic test evidence",
    start: 0,
    end: 23,
    entityId: null,
    locationOk: true,
    support: "supported",
    negationFlag: false,
    contentHash: `hash-${id}`,
    validatorVersion: "test",
  };
}
function context(): LetterContext {
  const facts = [
    fact("stay", "event", "Inpatient stay, synthetic dates"),
    fact("carotid", "recommendation", "Carotid duplex in two months"),
    fact("eye", "recommendation", "Regular eye check-ups"),
    fact("bp", "recommendation", "Regular blood pressure checks with GP medication adjustment"),
    fact("cancer", "diagnosis", "Synthetic breast diagnosis", "12340018"),
    fact("med-old", "medication", "Candesartan", "12340012", { listLabel: "Discharge medication" }),
    fact("med-new", "medication", "Candesartan", "12340018", { listLabel: "Discharge medication" }),
  ];
  const segments: Segment[] = facts.map((item) => ({
    id: item.segmentId,
    documentId: item.documentId,
    kind: "sentence",
    section: null,
    start: 0,
    end: item.quote.length,
    text: item.quote,
    textEn: item.labelEn,
  }));
  return {
    patientId: "test",
    window: {
      asOf: "2016-04-15",
      corpusRevision: "test",
      eligibleDocumentIds: ["12340012", "12340018"],
    },
    facts,
    segments,
  };
}
const absent = async (concept: string): Promise<AbsenceResult> => ({
  status: "not_documented",
  concept,
  searched: { eligible: 2, total: 2, asOf: "2016-04-15" },
  segmentIds: [],
});
describe("letter assembly through the claim boundary", () => {
  it("uses stay dates from the located header rather than the date of the letter", () => {
    const header: Segment = {
      id: "header",
      documentId: "12340012",
      kind: "sentence",
      section: null,
      start: 0,
      end: 70,
      text: "Admission on 02/06/2015 | Discharged on 09/06/2015",
      textEn: null,
    };
    const result = stayDateClaim([header], []);
    expect(result?.text).toBe("Follow-up of the inpatient stay, 02/06/2015 to 09/06/2015.");
    expect(result?.segmentIds).toEqual(["header"]);
    expect(stayDateClaim([{ ...header, text: "Document dated 22/06/2015" }], [])).toBeNull();
  });
  it("starts sentence validation while completion checks are still running", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let searches = 0;
    const sections = await assembleLetter(context(), [], {
      check: async (concept) => {
        searches++;
        await gate;
        return absent(concept);
      },
      validate: async (claims, ctx) => {
        expect(searches).toBe(3);
        release();
        return validateClaims(claims, ctx);
      },
    });
    expect(
      required(sections.find((section) => section.id === "completion")).claims.filter(
        (claim) => claim.kind === "absence",
      ),
    ).toHaveLength(3);
  });
  it("produces validated cited sections and one full-window absence per follow-up", async () => {
    const ctx = context();
    const searched: string[] = [];
    const sections = await assembleLetter(ctx, [], {
      validate: validateClaims,
      check: async (concept, _synonyms, window) => {
        expect(window).toBe(ctx.window);
        searched.push(concept);
        return absent(concept);
      },
    });
    expect(searched).toHaveLength(3);
    expect(searched.every((concept) => concept.includes("Exclude baseline"))).toBe(true);
    const completion = required(sections.find((section) => section.id === "completion"));
    expect(completion.claims.filter((claim) => claim.kind === "absence")).toHaveLength(3);
    expect(
      completion.claims.some((claim) =>
        claim.text.includes("no record of completion in the 2 eligible documents"),
      ),
    ).toBe(true);
    expect(required(sections.find((section) => section.id === "medication")).title).toBe(
      "Discharge medication, 15 Apr 2016",
    );
    expect(
      required(sections.find((section) => section.id === "medication")).claims.map(
        (claim) => claim.factIds,
      ),
    ).toEqual([["med-new"]]);
    for (const claim of sections.flatMap((section) => section.claims)) {
      expect(["supported", "exempt"]).toContain(claim.validation.support);
      if (claim.kind !== "boilerplate")
        expect(claim.factIds.length + claim.segmentIds.length).toBeGreaterThan(0);
    }
  });
  it("labels an older eligible medication list with its source date", async () => {
    const ctx = context();
    ctx.window = { ...ctx.window, asOf: "2015-07-01", eligibleDocumentIds: ["12340012"] };
    ctx.facts = ctx.facts.filter((fact) => fact.documentId === "12340012");
    ctx.segments = ctx.segments.filter((segment) => segment.documentId === "12340012");
    const sections = await assembleLetter(ctx, [], { validate: validateClaims, check: absent });
    expect(required(sections.find((section) => section.id === "medication")).title).toBe(
      "Discharge medication, 22 Jun 2015",
    );
    expect(
      required(sections.find((section) => section.id === "medication")).claims.map(
        (claim) => claim.factIds,
      ),
    ).toEqual([["med-old"]]);
  });
  it("does not turn a failed completion search into an absence claim", async () => {
    const sections = await assembleLetter(context(), [], {
      validate: validateClaims,
      check: async (concept) => ({ ...(await absent(concept)), status: "unavailable" }),
    });
    expect(
      sections.flatMap((section) => section.claims).some((claim) => claim.kind === "absence"),
    ).toBe(false);
  });
  it("rejects incomplete full-window absence provenance", async () => {
    const sections = await assembleLetter(context(), [], {
      validate: validateClaims,
      check: async (concept) => ({
        ...(await absent(concept)),
        searched: { eligible: 1, total: 2, asOf: "2016-04-15" },
      }),
    });
    expect(
      sections.flatMap((section) => section.claims).some((claim) => claim.kind === "absence"),
    ).toBe(false);
  });
  it("drops unsupported fact templates", async () => {
    const ctx = context();
    ctx.facts[0].support = "unsupported";
    const sections = await assembleLetter(ctx, [], { validate: validateClaims, check: absent });
    expect(required(sections.find((section) => section.id === "reason")).claims).toEqual([]);
  });
  it("retains both cited passages when a composed clarification falls back", async () => {
    const ctx = context();
    const finding: Finding = {
      id: "C1",
      type: "contradiction",
      title: "Carotid side",
      explanation: "Synthetic disagreement",
      severity: "high",
      computation: null,
      hypothesisText: null,
      passages: ctx.facts.slice(1, 3).map((item) => ({
        segmentId: item.segmentId,
        documentId: item.documentId,
        factId: item.id,
        quote: item.quote,
        start: item.start,
        end: item.end,
        claimEn: item.labelEn,
      })),
    };
    const sections = await assembleLetter(ctx, [finding], {
      check: absent,
      validate: async (claims, context) =>
        validateClaims(
          claims.map((claim) =>
            claim.kind === "composed" ? { ...claim, text: "Invented 999999" } : claim,
          ),
          context,
        ),
    });
    const clarification = required(sections.find((section) => section.id === "clarification"));
    expect(clarification.claims).toHaveLength(2);
    expect(clarification.claims.flatMap((claim) => claim.segmentIds)).toEqual(
      finding.passages.map((passage) => passage.segmentId),
    );
  });
});
