import { describe, expect, it } from "vitest";
import { findingCounts, sidebarCounts } from "./sidebar-counts.ts";

describe("sidebar record counts", () => {
  it("counts kinds from the supplied evidence window without another date filter", () => {
    const counts = sidebarCounts(
      [
        { kind: "medication" },
        { kind: "medication" },
        { kind: "diagnosis" },
        { kind: "lab" },
        { kind: "measurement" },
        { kind: "allergy", assertion: "negated" },
        { kind: "procedure", temporalStatus: "planned", eventDate: "2030-01-01" },
      ],
      3,
    );
    expect(counts["/patient"]).toBe(7);
    expect(counts["/patient/documents"]).toBe(3);
    expect(counts["/patient/medications"]).toBe(2);
    expect(counts["/patient/diagnoses"]).toBe(1);
    expect(counts["/patient/labs"]).toBe(2);
    expect(counts["/patient/allergies"]).toBe(1);
    expect(counts["/patient/procedures"]).toBe(1);
    expect(counts["/patient/oncology"]).toBe(0);
  });

  it("counts a reviewed finding until it is dismissed", () => {
    expect(
      findingCounts([
        { type: "contradiction", review: { action: "accepted" } },
        { type: "needs_clarification" },
        { type: "contradiction", review: { action: "dismissed" } },
      ]),
    ).toEqual({ open: 2, contradictions: true });
    expect(findingCounts([{ type: "contradiction", review: { action: "dismissed" } }])).toEqual({
      open: 0,
      contradictions: false,
    });
  });
});
