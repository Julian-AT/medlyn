import { describe, expect, it } from "vitest";
import type { Fact, Segment } from "../contracts.ts";
import { calculate, calculationClaim } from "../agent/calculation.ts";
import { gateAnswer } from "../agent/gate.ts";
import { validateClaims } from "../claims/validate.ts";

function weight(id: string, value: number, date: string): Fact {
  const quote = `Synthetic weight ${value} kg; archive reference 2033.`;
  return {
    id, segmentId: `${id}-s0`, documentId: id, kind: "measurement", labelEn: "Weight",
    attrs: { value, unit: "kg" }, assertion: "present", temporalStatus: "stated",
    eventDate: null, datePrecision: "day", dueDate: null, docDate: date,
    quote, start: 0, end: quote.length,
    entityId: "weight", locationOk: true, support: "supported", negationFlag: false,
    contentHash: `hash-${id}`, validatorVersion: "test",
  };
}

const facts = [weight("earlier", 96, "2015-06-02"), weight("later", 84, "2016-04-15")];
const ids = facts.map((fact) => fact.id);
const segments: Segment[] = facts.map((fact) => ({
  id: fact.segmentId, documentId: fact.documentId, kind: "sentence", section: null,
  text: fact.quote, textEn: null, start: fact.start, end: fact.end,
}));
const context = {
  patientId: "synthetic-patient",
  window: { asOf: "2016-04-15", corpusRevision: "synthetic-revision", eligibleDocumentIds: ids },
  facts,
  segments,
};

describe("calculation proofs", () => {
  it("returns the formula with fact ids and content hashes for every operand", () => {
    expect(calculate("84 - 96", ids, facts)).toEqual({
      expression: "84 - 96", value: -12, formula: "84 - 96 = -12", factIds: ids,
      operands: [
        { value: 84, factId: "later", contentHash: "hash-later" },
        { value: 96, factId: "earlier", contentHash: "hash-earlier" },
      ],
    });
  });

  it("rejects incidental quote numbers, missing facts and unused citations", () => {
    expect(() => calculate("2033 - 84", ids, facts)).toThrow("checked fact value");
    expect(() => calculate("84 - 96", ["unknown"], facts)).toThrow();
    expect(() => calculate("84 - 84", ids, facts)).toThrow("supply an operand");
    expect(() => calculate("84 - 96", [], facts)).toThrow();
  });

  it("rejects unsupported, partial, negated and planned values", () => {
    for (const patch of [
      { support: "unsupported" as const }, { support: "partial" as const },
      { assertion: "negated" as const }, { temporalStatus: "planned" as const },
      { attrs: { value: "84 mg extra", unit: "kg" } },
    ]) {
      expect(() => calculate("84 - 96", ids, [facts[0], { ...facts[1], ...patch }])).toThrow();
    }
  });

  it("reproduces only the shared weight template and cites all operand source segments", async () => {
    const proof = calculate("84 - 96", ids, facts);
    const claim = calculationClaim(proof, facts, context)!;
    expect(claim.kind).toBe("template");
    expect(claim.text).toBe("−12 kg, Jun 2015 → Apr 2016");
    expect(claim.factIds).toEqual(ids);
    expect(claim.segmentIds).toEqual(segments.map((segment) => segment.id));
    expect(claim.validation.support).toBe("unsupported");
    const [checked] = await validateClaims([claim], context);
    expect(checked.validation.support).toBe("supported");
    const [invented] = await validateClaims([{ ...claim, text: "Weight change: −13 kg" }], context);
    expect(invented.validation.support).toBe("unsupported");
  });

  it("fails closed on tampered formulas, values, hashes and evidence windows", () => {
    const proof = calculate("84 - 96", ids, facts);
    for (const patch of [
      { value: -13 }, { formula: "84 - 96 = -13" },
      { operands: proof.operands.map((operand) => ({ ...operand, contentHash: "stale" })) },
    ]) expect(calculationClaim({ ...proof, ...patch }, facts, context)).toBeNull();
    expect(calculationClaim(proof, [{ ...facts[0], contentHash: "changed" }, facts[1]], context))
      .toBeNull();
    expect(calculationClaim(proof, facts, {
      ...context, window: { ...context.window, eligibleDocumentIds: ["earlier"] },
    })).toBeNull();
    expect(calculationClaim(calculate("96 - 84", ids, facts), facts, context)).toBeNull();
    expect(calculationClaim(calculate("84 + 96", ids, facts), facts, context)).toBeNull();
  });

  it("keeps distinct equal-valued facts in a zero-change proof", () => {
    const equal = [facts[0], { ...facts[1], attrs: { value: 96, unit: "kg" } }];
    const proof = calculate("96 - 96", ids, equal);
    expect(proof.operands.map((operand) => operand.factId)).toEqual(ids);
    expect(calculationClaim(proof, equal, context)?.text).toBe("0 kg, Jun 2015 → Apr 2016");
  });

  it("passes calculations through the real gate and never exempts free-text derived numbers", async () => {
    const proof = calculate("84 - 96", ids, facts);
    const answer = await gateAnswer("Weight change: −12 kg [earlier] [later].", {
      factIds: ids, segmentIds: segments.map((segment) => segment.id), absences: [],
      factSegments: Object.fromEntries(facts.map((fact) => [fact.id, fact.segmentId])),
      facts, calculations: [proof],
    }, context.window, (claims) => validateClaims(claims, context));
    expect(answer.claims).toHaveLength(1);
    expect(answer.claims[0].kind).toBe("template");
    expect(answer.claims[0].validation.support).toBe("supported");
    expect(answer.nextAction).toBe("Add to the GP letter");
  });
});
