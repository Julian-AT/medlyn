import { afterEach, describe, expect, it, vi } from "vitest";
import { type ValidationContext, validateClaim, validateFindingText } from "../claims/validate.ts";
import { adjudicate } from "../findings/adjudicate.ts";
import { computeFindings } from "../findings/index.ts";
import { record } from "../findings/passages.ts";
import { sideCandidates } from "../findings/rules/side.ts";
import { CLARIFICATION_FALLBACK, PASSAGE_FALLBACK } from "../findings/text.ts";
import type { CorpusInputDocument, FindingInput } from "../findings/types.ts";
import { segment } from "../ingest/segment.ts";

function document(normText: string): CorpusInputDocument {
  return {
    rawText: normText,
    normText,
    offsetMap: [],
    doc: {
      id: "synthetic",
      patientId: "p",
      revisionId: "r",
      title: "Synthetic",
      titleEn: "Synthetic",
      docDate: "2025-06-09",
      docType: "test",
      department: "Test",
    },
    segments: segment(normText).map((item) => ({
      ...item,
      id: `synthetic-s${item.ordinal}`,
      documentId: "synthetic",
      textEn: null,
    })),
  };
}

const right = "Rechts carotis interna: 47% Verengung.";
const low = "Auf der linken Seite Plaque ohne hämodynamische Wirkung.";
const left = "Maximal 47% carotis interna links.";
const singleExam = `Duplex Sonographie der Halsarterien:\n${right}\n${low}\nGesamtbeurteilung:\n${left}`;
const inputFor = (text: string): FindingInput => ({ documents: [document(text)], facts: [] });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("finding evidence and display boundary", () => {
  it("requires an examination block before publishing the side rule offline", async () => {
    const input = inputFor(singleExam);
    expect(sideCandidates(input)[0].deterministic).toBe(true);
    const [finding] = await computeFindings(input, { llm: false });
    expect(finding.type).toBe("contradiction");
  });

  it.each([
    `Duplex Sonographie der Halsarterien vom 01.06.2025:\n${right}\n${low}\nDuplex Sonographie der Halsarterien vom 03.06.2025:\nGesamtbeurteilung:\n${left}`,
    `Duplex Sonographie der Halsarterien:\n${right}\n${low}\nDuplex Sonographie der Halsarterien:\nGesamtbeurteilung:\n${left}`,
    `Duplex Sonographie der Halsarterien:\nUntersuchung am 01.06.2025\n${right}\n${low}\nUntersuchung am 03.06.2025\nGesamtbeurteilung:\n${left}`,
    `${right}\n${low}\n${left}`,
  ])("keeps separate or unestablished examinations off screen (%#)", async (text) => {
    const input = inputFor(text);
    expect(sideCandidates(input)[0].deterministic).toBe(false);
    const findings = await computeFindings(input, { llm: false });
    expect(findings.every((finding) => finding.type === "dismissed_candidate")).toBe(true);
  });

  it("rebuilds every finding field instead of trusting supplied prose", async () => {
    const input = inputFor("Height: 182 cm\nWeight: 83 kg\nBMI: 31.2");
    const [original] = await computeFindings(input, { llm: false });
    const checked = await validateFindingText(
      {
        ...original,
        title: "Invented diagnosis",
        explanation: "Invented clinical cause",
        computation: "False formula",
        hypothesisText: "Invented hypothesis",
        passages: original.passages.map((passage) => ({
          ...passage,
          claimEn: "Invented source interpretation",
        })),
      },
      input,
    );
    expect(checked).toEqual(original);
    expect(checked.computation).toContain("vs stated 31.2");
  });

  it("rejects stronger arbitrary text at the Claim boundary and checks quote offsets", async () => {
    const input = inputFor(singleExam);
    const finding = record(sideCandidates(input)[0]);
    const ctx: ValidationContext = {
      patientId: "p",
      facts: [],
      segments: input.documents[0].segments,
      window: { asOf: "2025-06-09", corpusRevision: "r", eligibleDocumentIds: ["synthetic"] },
      finding: { record: finding, input },
    };
    const checked = await validateClaim(
      {
        id: "c",
        kind: "template",
        text: "The patient needs surgery.",
        factIds: [],
        segmentIds: [...new Set(finding.passages.map((passage) => passage.segmentId))],
        author: "machine",
        validation: { key: "", support: "supported" },
      },
      ctx,
    );
    expect(checked.validation.support).toBe("unsupported");
    const corrupted = {
      ...finding,
      passages: finding.passages.map((passage, index) =>
        index ? passage : { ...passage, start: passage.start + 1 },
      ),
    };
    expect((await validateFindingText(corrupted, input)).type).toBe("dismissed_candidate");
  });

  it("uses fixed minimal wording for an adjudicated candidate without a rule template", async () => {
    const input = inputFor(singleExam);
    const original = record(sideCandidates(input)[0]);
    const checked = await validateFindingText(
      {
        ...original,
        id: "swept-finding",
        category: "other",
        type: "needs_clarification",
        hypothesisText: "Unsupported theory",
      },
      input,
    );
    expect(checked.title).toBe(CLARIFICATION_FALLBACK);
    expect(checked.explanation).toBe(CLARIFICATION_FALLBACK);
    expect(checked.hypothesisText).toBeNull();
    expect(checked.computation).toBeNull();
    expect(checked.passages.every((passage) => passage.claimEn === PASSAGE_FALLBACK)).toBe(true);
  });

  it("does not reuse a rule's stronger text after its citations are removed", async () => {
    const input = inputFor(singleExam);
    const original = record(sideCandidates(input)[0]);
    const checked = await validateFindingText(
      { ...original, type: "needs_clarification", passages: original.passages.slice(1) },
      input,
    );
    expect(checked.explanation).toBe(CLARIFICATION_FALLBACK);
    expect(checked.passages.every((passage) => passage.claimEn === PASSAGE_FALLBACK)).toBe(true);
  });

  it("does not retain a contradiction explanation after adjudication downgrades it", async () => {
    const input = inputFor(singleExam);
    vi.stubEnv("MODEL_FAST", "synthetic");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      taxonomy: "needs_clarification",
                      sameEventEstablished: false,
                      certain: true,
                      rationale: "Synthetic context uncertain",
                      hypothesisText: "Unsupported theory",
                    }),
                  },
                },
              ],
            }),
          ),
      ),
    );
    const candidate = { ...sideCandidates(input)[0], deterministic: false };
    const adjudicated = await adjudicate(candidate, input);
    expect(adjudicated.type).toBe("needs_clarification");
    expect(adjudicated.explanation).toBe(CLARIFICATION_FALLBACK);
    const checked = await validateFindingText(adjudicated, input);
    expect(checked.title).toBe(CLARIFICATION_FALLBACK);
    expect(checked.explanation).toBe(CLARIFICATION_FALLBACK);
    expect(checked.hypothesisText).toBeNull();
  });
});
