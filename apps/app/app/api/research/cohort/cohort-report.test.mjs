import { describe, expect, it } from "vitest";
import { cohortReport } from "./cohort-report.ts";

describe("cohort summaries", () => {
  it("does not mistake sample-only counts for the full cohort", () => {
    const report = cohortReport({ counts: { patients: 20 } }, [], "sample");
    expect(report.scope).toBe("sample");
    expect(report.counts.patients).toBe(20);
    expect(report.rewrittenPatients).toBeNull();
  });
  it("aggregates scenario counts across styles without pooling splits", () => {
    const report = cohortReport(
      {
        splits: { train: 6, val: 2, test: 2 },
        families: { "compact:renal_review": 4, "narrative:renal_review": 6 },
      },
      [],
      "full",
    );
    expect(report.scenarios).toEqual([{ label: "Renal review", count: 10 }]);
    expect(report.splits.map((split) => split.count)).toEqual([6, 2, 2]);
  });
  it("exports sample labels without raw document bodies or span quotes", () => {
    const report = cohortReport(
      {},
      [
        {
          patient: { id: "sample", name: "Example" },
          documents: [{ metadata: { id: "doc", title: "Example report" }, text: "PRIVATE BODY" }],
          labels: {
            facts: [{ id: "fact", labelEn: "Example label", quote: "PRIVATE QUOTE" }],
            gaps: [{ concept: "Example gap" }],
          },
        },
      ],
      "sample",
    );
    expect(report.samples[0].facts[0].label).toBe("Example label");
    expect(JSON.stringify(report)).not.toContain("PRIVATE");
  });
});
