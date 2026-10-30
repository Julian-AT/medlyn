import { describe, expect, it } from "vitest";
import { canOpenCitation } from "./citation-interaction.ts";

const click = {
  keyboard: false,
  hasSelection: false,
  start: { x: 10, y: 20 },
  end: { x: 10, y: 20 },
};

describe("citation activation", () => {
  it("opens for an intentional pointer click", () => {
    expect(canOpenCitation(click)).toBe(true);
  });
  it("preserves text selection even if the drag ends on a marker", () => {
    expect(canOpenCitation({ ...click, hasSelection: true })).toBe(false);
    expect(canOpenCitation({ ...click, end: { x: 35, y: 20 } })).toBe(false);
    expect(canOpenCitation({ ...click, start: null })).toBe(false);
  });
  it("allows keyboard activation independently of pointer state", () => {
    expect(canOpenCitation({ ...click, keyboard: true, start: null, hasSelection: true })).toBe(
      true,
    );
  });
});
