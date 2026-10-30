import { describe, expect, it } from "vitest";
import { questionStatus } from "./workflow-state.ts";

const question = { id: "example", kind: "missing", title: "Example check" };

describe("workflow availability labels", () => {
  it("calls only a proven absence not documented", () => {
    expect(questionStatus(question, { availability: "not_documented" })).toBe("not_documented");
    expect(questionStatus(question, { availability: "unavailable" })).toBe("unavailable");
    expect(questionStatus(question)).toBe("unavailable");
    expect(questionStatus(question, { availability: "documented" })).toBe("unavailable");
  });
  it("keeps contradictions and clarification separate from availability", () => {
    expect(questionStatus({ ...question, kind: "contradiction" })).toBe("contradiction");
    expect(questionStatus({ ...question, kind: "needs_clarification" })).toBe(
      "needs_clarification",
    );
  });
});
