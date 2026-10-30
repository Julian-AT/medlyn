import { describe, expect, it } from "vitest";
import type { Fact } from "../contracts.ts";
import { timelinePoints } from "../agent/timeline.ts";

const fact = (id: string, date: string | null, labelEn = "Weight"): Fact => ({ id, eventDate: date, labelEn, docDate: "2016-01-02", kind: "measurement", entityId: "weight", attrs: {}, quote: "Synthetic measurement", segmentId: `${id}-s0`, documentId: id, assertion: "present", temporalStatus: "stated", datePrecision: "day", dueDate: null, start: 0, end: 21, locationOk: true, support: "supported", negationFlag: false, contentHash: id, validatorVersion: "test" });

describe("agent timeline", () => {
  it("sorts by event date, falls back to document date, and preserves future plans", () => {
    const input = [fact("late", "2017-01-01"), fact("early", "2015-02"), fact("undated", null), fact("other", "2014", "Blood pressure")];
    input[3].entityId = "bp";
    expect(timelinePoints(input, "weight").map((point) => point.factId)).toEqual(["early", "undated", "late"]);
    expect(input[0].id).toBe("late");
  });
  it("matches kind and rejects an empty search", () => {
    expect(timelinePoints([fact("a", null)], "measurement")).toHaveLength(1);
    expect(timelinePoints([fact("a", null)], " ")).toEqual([]);
  });
});
