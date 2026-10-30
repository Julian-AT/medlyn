import { describe, expect, it } from "vitest";
import type { Segment } from "../contracts.ts";
import { locate } from "../ingest/locate.ts";

function check(text: string, schedule: string[]) {
  const source: Segment = { id: "s", documentId: "d", kind: "table_row", section: null,
    text, textEn: null, start: 0, end: text.length };
  return locate(text, source, { attrs: { schedule } });
}

describe("ordered medication schedule location", () => {
  it("rejects reordered columns even when all values appear", () => {
    expect(check("Synthetic medicine 9mg oral 1 0 0 1 ST", ["1", "0", "1", "0"]).ok).toBe(false);
    expect(check("Synthetic medicine 9mg oral 1 0 0 1 ST", ["1", "0", "0", "1"]).ok).toBe(true);
  });

  it("preserves repeated cells and never skips an intervening dose", () => {
    expect(check("Synthetic oral 1 0 2 1 0 ST", ["1", "0", "1", "0"]).ok).toBe(false);
    expect(check("Synthetic oral 1 0 ST", ["1", "0", "0", "0"]).ok).toBe(false);
    expect(check("Synthetic oral 11 0 1 0 ST", ["1", "0", "1", "0"]).ok).toBe(false);
  });

  it.each(["1 0 ½ 0 ST", "1 ST 0 ST 1/2 ST 0 ST", "1-0-1/2-0", "1 | 0 | ½ | 0 Tabl."])(
    "accepts supported fraction and unit formatting: %s", (row) => {
      expect(check(`Synthetic oral ${row}`, ["1", "0", "1/2", "0"]).ok).toBe(true);
    },
  );

  it("requires an ST schedule cell to appear in its original position", () => {
    expect(check("Synthetic oral ST 0 1 0", ["ST", "0", "1", "0"]).ok).toBe(true);
    expect(check("Synthetic oral 0 ST 1 0", ["ST", "0", "1", "0"]).ok).toBe(false);
  });

  it("retains number and unit associations", () => {
    const text = "Synthetic oral 9 mg 1 0 1 0 ST";
    const source: Segment = { id: "s", documentId: "d", kind: "table_row", section: null,
      text, textEn: null, start: 0, end: text.length };
    expect(locate(text, source, { strength: "1 mg", schedule: ["1", "0", "1", "0"] }).ok).toBe(false);
  });
});
