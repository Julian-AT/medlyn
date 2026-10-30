import { describe, expect, it } from "vitest";
import { citedRuns } from "./cited-text.ts";

describe("validated citation placement", () => {
  it("preserves every character while attaching exact claim sources", () => {
    const text = "First checked sentence.\n\nSecond checked sentence.";
    const runs = citedRuns(text, [
      { text: "First checked sentence.", segmentIds: ["doc-s1", "doc-s1"] },
      { text: "Second checked sentence.", segmentIds: ["doc-s2"] },
    ]);
    expect(runs.map((run) => run.text).join("")).toBe(text);
    expect(runs.map((run) => run.segmentIds)).toEqual([["doc-s1"], [], ["doc-s2"]]);
  });
  it("does not attach a source to unmatched text", () => {
    expect(
      citedRuns("Other sentence.", [{ text: "Checked sentence.", segmentIds: ["doc-s1"] }]),
    ).toEqual([{ start: 0, text: "Other sentence.", segmentIds: [] }]);
  });
  it("handles repeated claims without losing text or source numbers", () => {
    const runs = citedRuns("Checked. Checked.", [{ text: "Checked.", segmentIds: ["doc-s1"] }]);
    expect(runs.map((run) => run.start)).toEqual([0, 8, 9]);
    expect(runs.filter((run) => run.segmentIds.length)).toHaveLength(2);
  });
  it("matches the longer claim first when claims share a prefix", () => {
    expect(
      citedRuns("Checked sentence.", [
        { text: "Checked", segmentIds: ["short"] },
        { text: "Checked sentence.", segmentIds: ["long"] },
      ])[0].segmentIds,
    ).toEqual(["long"]);
  });
  it("ignores empty claims", () => {
    expect(citedRuns("Text", [{ text: "", segmentIds: ["source"] }])[0].segmentIds).toEqual([]);
    expect(citedRuns("", [])).toEqual([]);
  });
  it("retains every source when identical checked claims cite different passages", () => {
    const runs = citedRuns("Checked sentence.", [
      { text: "Checked sentence.", segmentIds: ["source-a"] },
      { text: "Checked sentence.", segmentIds: ["source-b", "source-a"] },
    ]);
    expect(runs[0].segmentIds).toEqual(["source-a", "source-b"]);
    expect(runs.map((run) => run.text).join("")).toBe("Checked sentence.");
  });
});
