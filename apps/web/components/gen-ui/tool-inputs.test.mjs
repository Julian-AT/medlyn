import { describe, expect, it } from "vitest";
import { uiTools } from "../../../../packages/engine/agent/ui-tools.ts";

const tools = uiTools({
  patientId: "test-patient",
  sessionId: "test-session",
  window: { asOf: "2020-01-01", corpusRevision: "test-revision", eligibleDocumentIds: [] },
});

describe("UI tool optional filters", () => {
  it.each([
    ["show_findings", { topic: null }],
    ["show_findings", {}],
    ["show_medications", { list: null }],
    ["show_timeline", { kinds: null }],
    ["open_lens", { text: "Review a test situation", chipId: null }],
  ])("accepts the provider's nullable filter for %s", (name, input) => {
    expect(tools[name].inputSchema.safeParse(input).success).toBe(true);
  });
  it("still rejects invalid filter values", () => {
    expect(tools.show_medications.inputSchema.safeParse({ list: "current" }).success).toBe(false);
    expect(tools.show_timeline.inputSchema.safeParse({ kinds: ["invented"] }).success).toBe(false);
  });
});
