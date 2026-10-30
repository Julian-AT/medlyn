import { describe, expect, it } from "vitest";
import { conversationLensKey } from "../../../apps/app/app/api/chat/history-view.ts";

const context = (lensKey: unknown) => ({
  parts: [{ type: "data-evidence-context", data: { lensKey } }],
});

describe("client-held conversation evidence context", () => {
  it("preserves the latest lens reference on follow-up turns", () => {
    expect(conversationLensKey([context("earlier"), context("latest")])).toBe("latest");
  });

  it("prefers an explicit lens reference for a new investigation", () => {
    expect(conversationLensKey([context("earlier")], "selected")).toBe("selected");
  });

  it("does not revive an earlier lens after context has been reset", () => {
    expect(conversationLensKey([context("earlier"), context(null)])).toBeNull();
  });

  it.each([42, {}, "x".repeat(301), null])("ignores malformed references %#", (value) => {
    expect(conversationLensKey([context(value)])).toBeNull();
  });
});
