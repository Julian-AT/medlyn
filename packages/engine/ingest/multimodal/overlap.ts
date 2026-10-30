import type { Fact } from "../../contracts.ts";

function normalised(value: unknown): string {
  if (Array.isArray(value)) return value.map(normalised).join("|");
  if (value === undefined || value === null) return "";
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/(\d),(?=\d)/g, "$1.")
    .replace(/\s+/g, " ")
    .trim();
}

export type ComparableFact = Pick<Fact, "kind" | "labelEn" | "attrs">;

export function factKey(fact: ComparableFact): string {
  const value = fact.attrs.value ?? fact.attrs.result ?? fact.attrs.strength ?? fact.attrs.dose;
  return JSON.stringify([fact.kind, normalised(fact.labelEn), normalised(value)]);
}

/** Set recall by (kind, normalised label, value); duplicates never inflate overlap. */
export function factOverlap(baseline: ComparableFact[], candidate: ComparableFact[]) {
  const expected = new Set(baseline.map(factKey));
  const actual = new Set(candidate.map(factKey));
  const matched = [...expected].filter((key) => actual.has(key)).length;
  return {
    baseline: expected.size,
    candidate: actual.size,
    matched,
    recall: expected.size ? matched / expected.size : null,
    precision: actual.size ? matched / actual.size : null,
    missing: [...expected].filter((key) => !actual.has(key)),
    extra: [...actual].filter((key) => !expected.has(key)),
  };
}
