import type { Claim, Fact } from "../contracts.ts";
import { type ClaimCtx, trendLines } from "../lens/templates.ts";
import { arithmetic, numericValues } from "./arithmetic.ts";

export type CalculationOperand = {
  value: number;
  factId: string;
  contentHash: string;
};

export type Calculation = {
  expression: string;
  value: number;
  formula: string;
  factIds: string[];
  operands: CalculationOperand[];
};

function scalar(fact: Fact): number | null {
  if (!fact.locationOk || fact.support !== "supported" || fact.assertion !== "present") {
    return null;
  }
  if (!["measurement", "lab"].includes(fact.kind)) return null;
  if (["planned", "recommended"].includes(fact.temporalStatus)) return null;
  const value = fact.attrs.value;
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (!/^-?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(String(value).trim())) return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

/** Bind every expression operand to a checked scalar field, never incidental quote numbers. */
export function calculate(expression: string, factIds: string[], facts: Fact[]): Calculation {
  const ids = [...new Set(factIds)];
  if (!ids.length) throw new Error("Calculation requires cited facts");
  const selected = ids.map((id) => facts.find((fact) => fact.id === id));
  if (selected.some((fact) => !fact || scalar(fact) === null)) {
    throw new Error("Unknown, unsupported or nonnumeric calculation fact");
  }
  const values = numericValues(expression);
  const used = new Set<string>();
  const operands = values.map((value) => {
    const matches = selected.filter((candidate) => candidate && scalar(candidate) === value);
    const fact = matches.find((candidate) => candidate && !used.has(candidate.id)) ?? matches[0];
    if (!fact) throw new Error("Every operand must be a checked fact value");
    used.add(fact.id);
    return { value, factId: fact.id, contentHash: fact.contentHash };
  });
  if (ids.some((id) => !operands.some((operand) => operand.factId === id))) {
    throw new Error("Every cited calculation fact must supply an operand");
  }
  const value = arithmetic(expression);
  const normal = expression.trim();
  return { expression: normal, value, formula: `${normal} = ${value}`, factIds: ids, operands };
}

/** Only formulas represented by a shared checked template can become visible claims. */
export function calculationClaim(
  proof: Calculation,
  facts: Fact[],
  context: ClaimCtx,
): Claim | null {
  const selected = facts.filter((fact) => proof.factIds.includes(fact.id));
  if (selected.some((fact) => !context.window.eligibleDocumentIds.includes(fact.documentId))) {
    return null;
  }
  let recomputed: Calculation;
  try {
    recomputed = calculate(proof.expression, proof.factIds, selected);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return null;
  }
  if (JSON.stringify(recomputed) !== JSON.stringify(proof) || selected.length !== 2) return null;
  const ordered = [...selected].sort((a, b) =>
    (a.eventDate ?? a.docDate).localeCompare(b.eventDate ?? b.docDate),
  );
  // The shared weight template describes later minus earlier, never the reverse or a ratio.
  const values = numericValues(proof.expression);
  if (!/^\s*\d+(?:\.\d+)?\s*-\s*\d+(?:\.\d+)?\s*$/.test(proof.expression)) {
    return null;
  }
  if (values[0] !== scalar(ordered[1]) || values[1] !== scalar(ordered[0])) return null;
  const line = trendLines(ordered, context).find((line) => line.factIds.length === 2);
  return line ? { ...line, validation: { key: "", support: "unsupported" } } : null;
}
