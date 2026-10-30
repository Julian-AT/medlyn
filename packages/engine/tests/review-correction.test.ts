import { expect, it } from "vitest";
import type { Fact } from "../contracts.ts";
import { checkCorrection } from "../review/ledger.ts";

it("checks a correction against the original passage independently of the faulty extraction", async () => {
  const fact = { id: "fact", segmentId: "original-passage", support: "partial" } as Fact;
  const window = { asOf: "2016-04-15", eligibleDocumentIds: ["d"], corpusRevision: "r" };
  const result = await checkCorrection("Corrected source-supported statement", fact, window, [], async (claim, context) => {
    expect(claim.segmentIds).toEqual(["original-passage"]); expect(claim.factIds).toEqual([]); expect(claim.kind).toBe("composed");
    expect(context.facts[0]).toBe(fact); expect(context.window).toBe(window);
    return { ...claim, validation: { key: "checked", support: "supported" } };
  });
  expect(result).toBe("supported"); expect(fact.support).toBe("partial");
});

it("does not turn partial correction support into a corrected patient fact", async () => {
  const result = await checkCorrection("Uncertain edit", { segmentId: "segment" } as Fact, { asOf: "2016-04-15", eligibleDocumentIds: [], corpusRevision: "r" }, [], async (claim) => ({ ...claim, validation: { key: "partial", support: "partial" } }));
  expect(result).toBe("unsupported");
});
