import { describe, expect, it } from "vitest";
import { locatedFact } from "../ingest/extract.ts";
import {
  GERMAN_LABEL_TOKENS,
  germanLabelTokens,
  normaliseLabel,
} from "../ingest/label-normalise.ts";
import { measurement, segmentFor } from "./label-series-fixtures.ts";

describe("English fact labels", () => {
  it.each([
    ["Observation etwa 3 Stunden", "Observation about 3 hours"],
    ["Pressure bis 145 mmHg", "Pressure up to 145 mmHg"],
    ["Weight 82 Kilogramm", "Weight 82 kg"],
    ["Systolischer Blutdruck", "systolic blood pressure"],
    ["EF 58 Prozent", "EF 58%"],
    ["Follow-up in 2 Monaten", "Follow-up in 2 months"],
    ["Bilateral findings ohne symptoms", "Bilateral findings without symptoms"],
    ["Unknownbrand 2 mg/mL", "Unknownbrand 2 mg/mL"],
    ["HbA1c 6,4%", "HbA1c 6,4%"],
  ])("normalises %s without changing values", (input, expected) => {
    expect(normaliseLabel(input)).toBe(expected);
    expect(normaliseLabel(expected)).toBe(expected);
    expect(germanLabelTokens(normaliseLabel(input))).toEqual([]);
  });

  it.each(GERMAN_LABEL_TOKENS)("removes the German token %s", (token) => {
    expect(germanLabelTokens(token.toUpperCase()).length).toBeGreaterThan(0);
    expect(germanLabelTokens(normaliseLabel(token))).toEqual([]);
  });

  it("matches complete Unicode words and preserves unit abbreviations", () => {
    expect(normaliseLabel("Baseline vitamin D 20 µg, mmHg and hours")).toBe(
      "Baseline vitamin D 20 µg, mmHg and hours",
    );
    expect(germanLabelTokens("mitral borderline admission")).toEqual([]);
  });

  it("normalises extraction labels before location and hashing", () => {
    const fact = measurement();
    const cd = {
      doc: {
        id: fact.documentId,
        patientId: "synthetic",
        revisionId: "synthetic",
        title: "Synthetic",
        titleEn: "Synthetic",
        docType: "test",
        docDate: fact.docDate,
        department: "test",
      },
      normText: fact.quote,
      rawText: fact.quote,
      offsetMap: [],
      segments: [{ ...segmentFor(fact), ordinal: 0 }],
    };
    const candidate = {
      segmentId: fact.segmentId,
      quote: fact.quote,
      kind: fact.kind,
      labelEn: "Gewicht 82 Kilogramm",
      attrs: [
        { key: "value", value: "82" },
        { key: "unit", value: "kg" },
      ],
      assertion: fact.assertion,
      temporalStatus: fact.temporalStatus,
      eventDate: null,
      datePrecision: null,
      relativeDue: null,
    };
    const result = locatedFact(candidate, cd);
    expect(result).toMatchObject({ labelEn: "weight 82 kg", locationOk: true, quote: fact.quote });
    expect(result?.id).toBe(`f-${result?.contentHash.slice(0, 16)}`);
    expect(locatedFact({ ...candidate, labelEn: "Gewicht 99 kg" }, cd, () => undefined)).toBeNull();
  });
});
