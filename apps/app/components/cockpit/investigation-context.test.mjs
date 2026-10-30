import { describe, expect, it } from "vitest";
import { investigationContext } from "./investigation-context.ts";

describe("investigation handoff", () => {
  it("carries exact passage references and requests investigation tools", () => {
    const finding = {
      id: "finding",
      passages: [{ documentId: "example", segmentId: "example-s1", start: 5, end: 12 }],
    };
    const text = investigationContext({ title: "Example discrepancy" }, finding);
    expect(text).toContain("Example discrepancy");
    expect(text).toContain("example@5–12");
    expect(text).toContain("example-s1");
    expect(text).toContain("show_findings");
    expect(text).toContain("show_passage");
  });
  it("requires a full documentation check for gaps", () => {
    const text = investigationContext({ title: "Checked gap" }, undefined, {
      title: "Example follow-up",
    });
    expect(text).toContain("check_documented");
    expect(text).toContain("Example follow-up");
    expect(text).toContain("do not infer completion");
  });
});
