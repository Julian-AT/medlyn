import { describe, expect, it } from "vitest";
import { type ComparableFact, factKey, factOverlap } from "../ingest/multimodal/overlap.ts";

const fact: ComparableFact = {
  kind: "measurement",
  labelEn: " Test  value ",
  attrs: { value: "7,5 mm" },
};

describe("PDF / JSON fact overlap", () => {
  it("folds label whitespace, Unicode width, case and decimal separators", () => {
    expect(factKey(fact)).toBe(
      factKey({
        ...fact,
        labelEn: "TEST VALUE",
        attrs: { value: "７.５ mm" },
      }),
    );
  });
  it("counts duplicates once and reports missing and extra triples", () => {
    const different = { ...fact, attrs: { value: "9 mm" } };
    const result = factOverlap([fact, fact, different], [fact, fact]);
    expect(result.baseline).toBe(2);
    expect(result.matched).toBe(1);
    expect(result.recall).toBe(0.5);
    expect(result.precision).toBe(1);
    expect(result.missing).toHaveLength(1);
    expect(result.extra).toHaveLength(0);
    expect(factOverlap([], []).recall).toBeNull();
  });
  it("does not match a changed kind or value", () => {
    expect(factOverlap([fact], [{ ...fact, kind: "lab" }]).matched).toBe(0);
    expect(factOverlap([fact], [{ ...fact, attrs: { value: "75 mm" } }]).matched).toBe(0);
  });
});
