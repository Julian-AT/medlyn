import { describe, expect, it } from "vitest";
import { adjudicate } from "../findings/adjudicate.ts";
import { computeFindings } from "../findings/index.ts";
import { findingId } from "../findings/passages.ts";
import { bmiInterval } from "../findings/rules/bmi.ts";
import type { CorpusInputDocument } from "../findings/types.ts";
import { segment } from "../ingest/segment.ts";

function document(normText: string, id = "synthetic"): CorpusInputDocument {
  return {
    rawText: normText,
    offsetMap: Array.from({ length: normText.length + 1 }, (_, i) => i),
    doc: {
      id,
      patientId: "test-patient",
      revisionId: "test-revision",
      title: "Synthetic",
      titleEn: "Synthetic",
      docDate: "2025-06-01",
      docType: "test",
      department: "test",
    },
    normText,
    segments: segment(normText).map((s) => ({
      ...s,
      id: `${id}-s${s.ordinal}`,
      documentId: id,
      textEn: null,
    })),
  };
}

const run = (documents: CorpusInputDocument[]) =>
  computeFindings({ documents, facts: [] }, { llm: false });

describe("findings rules", () => {
  it("returns no findings for an empty corpus", async () => {
    expect(await run([])).toEqual([]);
  });

  it("uses both height and weight rounding at interval extremes", () => {
    const [low, high] = bmiInterval(182, 83);
    expect(low).toBeCloseTo(82.5 / 1.825 ** 2);
    expect(high).toBeCloseTo(83.5 / 1.815 ** 2);
  });

  it("accepts a rounded BMI and rejects an incompatible BMI", async () => {
    const consistent = document("Height: 182 cm\nWeight: 83 kg\nBMI: 25.1");
    expect(await run([consistent])).toEqual([]);
    const incorrect = document("Height: 182 cm\nWeight: 83 kg\nBMI: 31.2");
    const findings = await run([incorrect]);
    expect(findings).toHaveLength(1);
    expect(findings[0].type).toBe("contradiction");
    expect(findings[0].passages).toHaveLength(3);
    expect(findings[0].computation).toContain("vs stated 31.2");
  });

  it("respects the displayed precision of an integer BMI", async () => {
    expect(await run([document("Height: 182 cm\nWeight: 83 kg\nBMI: 25")])).toEqual([]);
  });

  it("does not combine measurements across documents or distant visits", async () => {
    expect(
      await run([document("Height: 182 cm", "a"), document("Weight: 83 kg\nBMI: 31.2", "b")]),
    ).toEqual([]);
    expect(
      await run([
        document(`Height: 182 cm\n${"Unrelated visit. ".repeat(30)}\nWeight: 83 kg\nBMI: 31.2`),
      ]),
    ).toEqual([]);
  });

  it("does not infer contradictions from medication, weight or allergy changes", async () => {
    expect(
      await run([
        document("Weight: 81 kg\nTreatment: medicine A twice daily\nAllergy: rash", "a"),
        document("Weight: 74 kg\nTreatment: medicine A once daily\nAllergy: rash and nausea", "b"),
      ]),
    ).toEqual([]);
  });

  it("does not link case numbers merely because they differ", async () => {
    expect(await run([document("Fall: 99881", "a"), document("Fall: 99882", "b")])).toEqual([]);
  });

  it("keeps a restated discharge typo deterministic and segment-contained", async () => {
    const findings = await run([
      document("Entlassen am 06/06/20255\nAm 06.06.2025 nach Hause entlassen."),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0].category).toBe("restated_date");
    expect(findings[0].severity).toBe("low");
  });

  it("does not invent a biopsy link from dates alone", async () => {
    expect(
      await run([
        document("Entnahmedatum: 04.06.2025", "a"),
        document("Ultraschalluntersuchung Brust vom 05.06.2025\nultraschallgezielte Biopsie", "b"),
      ]),
    ).toEqual([]);
  });

  it("dismisses an unadjudicated candidate when the configured model is unavailable", async () => {
    const input = { documents: [document("Height: 182 cm\nWeight: 83 kg\nBMI: 31.2")], facts: [] };
    const [finding] = await computeFindings(input, { llm: false });
    const previous = process.env.MODEL_FAST;
    delete process.env.MODEL_FAST;
    try {
      const result = await adjudicate({ ...finding, deterministic: false }, input);
      expect(result.type).toBe("dismissed_candidate");
      expect(result.explanation).toContain("unavailable");
    } finally {
      if (previous === undefined) delete process.env.MODEL_FAST;
      else process.env.MODEL_FAST = previous;
    }
  });

  it("makes ids independent of passage ordering", () => {
    const passages = [1, 2].map((i) => ({
      segmentId: `s${i}`,
      documentId: "test",
      factId: null,
      quote: "Synthetic",
      start: i * 10,
      end: i * 10 + 9,
      claimEn: "Synthetic",
    }));
    expect(findingId("test", passages)).toBe(findingId("test", passages.reverse()));
    expect(findingId("other", passages)).not.toBe(findingId("test", passages));
  });
});
