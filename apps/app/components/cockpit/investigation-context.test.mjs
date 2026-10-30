import { describe, expect, it } from "vitest";
import { investigationContext } from "./investigation-context.ts";

describe("investigation handoff", () => {
  it("keeps the visible chat request readable while asking for every passage", () => {
    const finding = {
      id: "internal-finding",
      passages: [{ documentId: "example", segmentId: "example-s1", start: 5, end: 12 }],
    };
    const text = investigationContext({ title: "Example discrepancy" }, finding);
    expect(text).toContain("Example discrepancy");
    expect(text).toContain("Compare every source passage");
    expect(text).not.toContain("internal-finding");
    expect(text).not.toContain("example-s1");
    expect(text).not.toMatch(/show_findings|show_passage/);
  });
  it("requires a full documentation check for gaps", () => {
    const text = investigationContext({ title: "Checked gap" }, undefined, {
      title: "Example follow-up",
    });
    expect(text).toContain("Check all eligible documents");
    expect(text).toContain("Example follow-up");
    expect(text).toContain("do not infer completion");
  });
});
