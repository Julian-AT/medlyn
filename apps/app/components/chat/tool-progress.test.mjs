import { describe, expect, it } from "vitest";
import { followUpSuggestions } from "./follow-up-suggestions.ts";
import { progressSummary, toolSteps } from "./tool-progress.ts";

const tool = (name, output, state = "output-available") => ({
  type: `tool-${name}`,
  toolCallId: name,
  state,
  input: {},
  output,
});

describe("evidence progress", () => {
  it("deduplicates documents and checked facts without claiming an exhaustive search", () => {
    const parts = [
      tool("search_facts", {
        facts: [{ documentId: "doc-a" }, { documentId: "doc-a" }, { documentId: "doc-b" }],
      }),
    ];
    expect(progressSummary(parts, ["a", "a", "b"])).toBe(
      "Retrieved from 2 documents · checked 2 facts",
    );
  });
  it("counts documents only after successful full-document checks", () => {
    const output = { status: "not_documented", searched: { eligible: 8, total: 8 } };
    expect(progressSummary([tool("check_documented", output)], ["a", "b", "c"])).toBe(
      "Searched 8 documents · checked 3 facts",
    );
    expect(
      progressSummary([tool("check_documented", { ...output, status: "unavailable" })], []),
    ).not.toContain("Searched");
  });
  it("keeps active, failed and completed tool states distinct", () => {
    expect(toolSteps([tool("search_facts", null, "input-available")])[0].status).toBe("active");
    expect(toolSteps([tool("search_facts", null, "output-error")])[0].failed).toBe(true);
    expect(toolSteps([tool("search_facts", { facts: [] })])[0].failed).toBe(false);
  });
  it("generates fixed follow-ups from successful tools without extra inference", () => {
    const message = { id: "example", role: "assistant", parts: [tool("show_medications", {})] };
    expect(followUpSuggestions(message)).toHaveLength(3);
    expect(followUpSuggestions(message)[0]).toContain("trend");
    expect(
      followUpSuggestions({
        ...message,
        parts: [tool("show_medications", null, "output-error")],
      })[0],
    ).not.toContain("medication");
  });
});
