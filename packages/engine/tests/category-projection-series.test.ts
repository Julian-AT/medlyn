import { describe, expect, it } from "vitest";
import { categoryProjections } from "../../../apps/app/components/categories/category-projections.ts";
import { evidenceLine, measurement } from "./label-series-fixtures.ts";

const row = (fact = measurement()) => ({ fact, claim: evidenceLine(fact).line });

describe("category projections", () => {
  it("groups measurement aliases and retains newest values with source-linked history", () => {
    const before = row(measurement({ labelEn: "Body weight" }));
    const after = row(
      measurement({ labelEn: "Weight", docDate: "2026-01-02", attrs: { value: "80", unit: "kg" } }),
    );
    const groups = categoryProjections([before, after]);
    expect(groups).toHaveLength(1);
    expect(groups[0].latest).toEqual(after);
    expect(groups[0].history).toEqual([after, before]);
    expect(groups[0].points).toHaveLength(2);
  });

  it("keeps unit-less measurements in table history", () => {
    const fragment = row(measurement({ attrs: { value: "82" } }));
    const [group] = categoryProjections([fragment]);
    expect(group.history).toEqual([fragment]);
    expect(group.points).toEqual([]);
  });

  it("groups generic measurements by entity or the label without checked values", () => {
    const first = row(
      measurement({
        labelEn: "Synthetic analyte 1.2 mg/dL",
        attrs: { value: "1.2", unit: "mg/dL" },
      }),
    );
    const second = row(
      measurement({
        labelEn: "Synthetic analyte 1.4 mg/dL",
        attrs: { value: "1.4", unit: "mg/dL" },
      }),
    );
    const [group] = categoryProjections([first, second]);
    expect(group.history).toHaveLength(2);
    expect(group.points).toHaveLength(2);
    const entity = row(measurement({ labelEn: "Another label", entityId: "synthetic-entity" }));
    expect(categoryProjections([entity])[0].points).toHaveLength(1);
  });

  it("does not collapse conflicting latest sources or assertion states", () => {
    const a = row(measurement());
    const b = row(
      measurement({
        documentId: "synthetic-d2",
        segmentId: "synthetic-d2-s0",
        attrs: { value: "85", unit: "kg" },
      }),
    );
    const [group] = categoryProjections([a, b]);
    expect(group.latestRows).toHaveLength(2);
    expect(group.sourceCount).toBe(2);
    expect(categoryProjections([a, row(measurement({ assertion: "negated" }))])).toHaveLength(2);
  });

  it("deduplicates observed readings across kinds and retains each temporal status in history", () => {
    const first = row(measurement({ temporalStatus: "done" }));
    const second = row(measurement({ kind: "lab", temporalStatus: "stated" }));
    const [group] = categoryProjections([first, second]);
    expect(group.history).toHaveLength(2);
    expect(group.points).toHaveLength(1);
    expect(new Set(group.history.map(({ fact }) => fact.temporalStatus))).toEqual(
      new Set(["done", "stated"]),
    );
    expect(
      categoryProjections([first, row(measurement({ temporalStatus: "planned" }))]),
    ).toHaveLength(2);
  });

  it("uses checked event dates rather than a later document date to select the newest value", () => {
    const older = row(measurement({ eventDate: "2025-01-01", docDate: "2026-01-02" }));
    const newer = row(measurement({ eventDate: "2025-12-31", docDate: "2026-01-01" }));
    expect(categoryProjections([older, newer])[0].latest).toEqual(newer);
  });
});
