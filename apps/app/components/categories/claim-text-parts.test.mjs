import { describe, expect, it } from "vitest";
import { claimTextParts } from "./claim-text-parts.ts";

const claim = (text, overrides = {}) => ({
  kind: "template",
  factIds: ["synthetic-fact"],
  text,
  ...overrides,
});

describe("claim text layout", () => {
  it("separates source metadata without rewriting the checked claim", () => {
    const input = claim("Synthetic planned procedure, 1 Jun 2025 · Example report, 1 May 2025");
    const result = claimTextParts(input);
    expect(result).toEqual({
      primary: "Synthetic planned procedure, 1 Jun 2025",
      source: "Example report, 1 May 2025",
    });
    expect(`${result.primary} · ${result.source}`).toBe(input.text);
  });

  it("keeps internal separators in the clinical text", () => {
    expect(claimTextParts(claim("Example finding · qualifier · Example report")).primary).toBe(
      "Example finding · qualifier",
    );
  });

  it.each(["composed", "absence", "annotation"])("keeps %s text intact", (kind) => {
    const input = claim("Example statement · qualification", { kind });
    expect(claimTextParts(input)).toEqual({ primary: input.text, source: null });
  });

  it("keeps multi-fact templates intact", () => {
    const input = claim("Example comparison · detail", { factIds: ["left", "right"] });
    expect(claimTextParts(input)).toEqual({ primary: input.text, source: null });
  });

  it.each(["Example without source", "Example · ", " · Example source"])(
    "keeps incomplete source boundaries intact: %s",
    (text) => {
      expect(claimTextParts(claim(text))).toEqual({ primary: text, source: null });
    },
  );
});
