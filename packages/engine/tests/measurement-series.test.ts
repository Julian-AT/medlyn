import { describe, expect, it } from "vitest";
import { labUiPoints, UiToolSchemas } from "../agent/ui-tools.ts";
import type { Fact } from "../contracts.ts";
import { evidenceLine, measurement } from "./label-series-fixtures.ts";

const points = (facts: Fact[], measure = "weight") =>
  labUiPoints(facts, facts.map(evidenceLine), measure);
const bp = (patch: Partial<Fact> = {}) =>
  measurement({ labelEn: "Blood pressure", attrs: { value: "142/86", unit: "mmHg" }, ...patch });

describe("measurement series", () => {
  it("deduplicates date, value, unit and document while preserving both passages", () => {
    const first = measurement();
    const second = measurement({ segmentId: "synthetic-d1-s1" });
    const result = points([second, first, first]);
    expect(result).toHaveLength(1);
    expect(result[0].sources).toHaveLength(2);
    expect(result[0].sourceCount).toBe(1);
    expect(points([first, second])).toEqual(result);
  });

  it("keeps same-day different-document values and counts their distinct sources", () => {
    const result = points([
      measurement(),
      measurement({ documentId: "synthetic-d2", segmentId: "synthetic-d2-s0" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((point) => point.sourceCount)).toEqual([2, 2]);
    expect(new Set(result.map((point) => point.documentId)).size).toBe(2);
  });

  it("keeps distinct measurements, units and dates apart", () => {
    const result = points([
      measurement(),
      measurement({ eventDate: "2025-12-31" }),
      measurement({ attrs: { value: "83", unit: "kg" } }),
      measurement({ attrs: { value: "82", unit: "lb" } }),
    ]);
    expect(result).toHaveLength(4);
    expect(result.map((point) => point.sourceCount)).toEqual([1, 1, 1, 1]);
  });

  it("accepts decimal commas and canonicalises explicitly supplied units", () => {
    expect(points([measurement({ attrs: { value: "82,5", unit: "Kilogramm" } })])[0]).toMatchObject(
      { value: 82.5, unit: "kg", displayValue: "82.5 kg" },
    );
  });

  it.each([undefined, null, "", " ", "unknown", "unitless", "N/A", "-"])(
    "keeps unit-less fragment %s out of charts",
    (unit) => {
      expect(points([measurement({ attrs: { value: "82", unit } })])).toEqual([]);
    },
  );

  it("represents blood pressure with one paired display value and both components", () => {
    const result = points([bp()], "blood_pressure");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      series: "blood_pressure",
      value: 142,
      diastolic: 86,
      unit: "mmHg",
      displayValue: "142/86 mmHg",
    });
    expect(
      UiToolSchemas.show_lab_trend.safeParse({
        measure: "blood_pressure",
        asOf: "2026-01-02",
        points: result,
        deltaLine: null,
      }).success,
    ).toBe(true);
  });

  it("pairs split components only when document, passage, date and unit agree", () => {
    const systolic = bp({
      labelEn: "Systolic blood pressure",
      attrs: { value: "142", unit: "mmHg" },
    });
    const diastolic = bp({
      labelEn: "Diastolic blood pressure",
      attrs: { value: "86", unit: "mmHg" },
    });
    expect(points([systolic, diastolic], "blood_pressure")[0]).toMatchObject({
      value: 142,
      diastolic: 86,
      displayValue: "142/86 mmHg",
      sources: expect.any(Array),
    });
    expect(points([systolic, diastolic], "blood_pressure")[0].sources).toHaveLength(2);
    for (const patch of [
      { segmentId: "other" },
      { documentId: "other" },
      { eventDate: "2025-12-30" },
      { attrs: { value: "86", unit: "kPa" } },
    ]) {
      expect(points([systolic, bp({ ...diastolic, ...patch })], "blood_pressure")).toEqual([]);
    }
  });

  it("does not guess component pairing for ambiguous passages or incomplete readings", () => {
    const systolic = bp({
      labelEn: "Systolic blood pressure",
      attrs: { value: "142", unit: "mmHg" },
    });
    const diastolic = bp({
      labelEn: "Diastolic blood pressure",
      attrs: { value: "86", unit: "mmHg" },
    });
    const other = bp({ labelEn: "Systolic blood pressure", attrs: { value: "150", unit: "mmHg" } });
    expect(points([systolic], "blood_pressure")).toEqual([]);
    expect(points([systolic, diastolic, other], "blood_pressure")).toEqual([]);
  });

  it("does not chart unvalidated, negated, historical, planned or qualified values", () => {
    for (const patch of [
      { support: "unsupported" },
      { assertion: "negated" },
      { assertion: "historical" },
      { temporalStatus: "planned" },
      { temporalStatus: "recommended" },
      { attrs: { value: "<82", unit: "kg" } },
    ] as Partial<Fact>[])
      expect(points([measurement(patch)])).toEqual([]);
    expect(labUiPoints([measurement()], [], "weight")).toEqual([]);
  });
});
