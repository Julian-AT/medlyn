import { describe, expect, it } from "vitest";
import { codeCheck } from "../claims/code-check.ts";
import { type CacheIdentity, cacheKey, normaliseClaimText } from "../claims/identity.ts";

const base: CacheIdentity = {
  patientId: "synthetic-p",
  corpusRevision: "synthetic-r",
  asOf: "2016-04-15",
  eligibleDocumentIds: ["synthetic-d"],
  validatorVersion: "v1:model1",
  text: "Synthetic claim",
  facts: [{ id: "synthetic-f", contentHash: "h1" }],
  segmentIds: ["synthetic-s"],
};
describe("validation identity", () => {
  it.each([
    { patientId: "other" },
    { corpusRevision: "other" },
    { asOf: "2016-04-14" },
    { eligibleDocumentIds: ["other"] },
    { validatorVersion: "v2:model1" },
    { validatorVersion: "v1:model2" },
    { text: "Other claim" },
    { facts: [{ id: "other", contentHash: "h1" }] },
    { facts: [{ id: "synthetic-f", contentHash: "h2" }] },
    { segmentIds: ["other"] },
  ])("changes for each tuple component %j", (change) =>
    expect(cacheKey({ ...base, ...change })).not.toBe(cacheKey(base)),
  );
  it("normalises whitespace and set order without losing case or meaning", () => {
    expect(normaliseClaimText(" A\n  claim ")).toBe("A claim");
    const two = {
      ...base,
      eligibleDocumentIds: ["a", "b"],
      segmentIds: ["c", "d"],
      facts: [
        { id: "a", contentHash: "1" },
        { id: "b", contentHash: "2" },
      ],
    };
    expect(cacheKey(two)).toBe(
      cacheKey({
        ...two,
        text: " Synthetic  claim ",
        eligibleDocumentIds: ["b", "a"],
        segmentIds: ["d", "c"],
        facts: [...two.facts].reverse(),
      }),
    );
  });
});
describe("sensitive tokens", () => {
  it.each([
    ["Dose 26 mg", ["Dose 25 mg"], false],
    ["Right breast", ["Linke Brust"], false],
    ["No atrial fibrillation", ["Atrial fibrillation"], false],
    ["Left breast", ["Brust links"], true],
    ["No atrial fibrillation", ["Kein Vorhofflimmern"], true],
    ["25 mg, 1-0-½", ["25 mg 1 0 1/2 0"], true],
    ["15 Apr 2016", ["15.04.2016"], true],
    ["Jun 2015", ["2015-06-23"], true],
    ["16 Apr 2016", ["2016-04-15"], false],
    ["5 kg", ["5 mg"], false],
    ["25 mg", ["25 kg and 5 mg"], false],
    ["−5 kg", ["5 kg"], false],
    ["1-0-1", ["1-0-0"], false],
    ["1-0-½", ["1 0 1/2 0"], true],
    ["Denies symptoms", ["Symptoms"], false],
    ["No symptoms", ["Symptome verneint"], true],
    ["In June", ["2015-07-01"], false],
    ["In June", ["2015-06-01"], true],
  ])("checks %s", (text, sources, ok) => expect(codeCheck(text, sources).ok).toBe(ok));
});
