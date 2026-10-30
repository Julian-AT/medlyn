import { describe, expect, it } from "vitest";
import { conceptSynonyms } from "../agent/tools.ts";

describe("agent search expansion", () => {
  it("uses the need catalog for recognized concepts", () => {
    expect(conceptSynonyms("kidney function")).toContain("kidney function");
    expect(conceptSynonyms("kidney function").length).toBeGreaterThan(1);
  });
  it("preserves the completion date and qualifier on every synonym", () => {
    const terms = conceptSynonyms("Documented completion after 2015-06-28 of: carotid ultrasound");
    expect(terms.length).toBeGreaterThan(1);
    expect(terms.every((term) => term.startsWith("Documented completion after 2015-06-28 of: ") && term.endsWith("."))).toBe(true);
  });
});
