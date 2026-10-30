import { describe, expect, it } from "vitest";
import { groupEvidence } from "./group-evidence.ts";

const row = (id, patch = {}, linePatch = {}) => ({
  fact: {
    id,
    entityId: "entity-test",
    kind: "measurement",
    labelEn: "Test metric",
    attrs: { value: 12, unit: "mm" },
    docDate: "2024-01-01",
    eventDate: null,
    ...patch,
  },
  line: {
    id,
    kind: "template",
    text: "Test metric 12 mm · Test letter, 1 Jan 2024",
    factIds: [id],
    segmentIds: [`${id}-s0`],
    assertion: "present",
    temporalStatus: "stated",
    validation: { support: "supported" },
    ...linePatch,
  },
});
const group = (rows) =>
  groupEvidence(
    rows,
    (item) => item.line,
    (item) => item.fact,
  );

describe("source grouping", () => {
  it("groups identical entities and values, newest source first", () => {
    const older = row("old", { kind: "allergy", docDate: "2023-01-01" });
    const newer = row(
      "new",
      { kind: "allergy" },
      { text: "Test metric 12 mm · Another letter, 1 Jan 2024" },
    );
    const [result] = group([older, newer]);
    expect(result.item.fact.id).toBe("new");
    expect(result.sources.map((item) => item.fact.id)).toEqual(["new", "old"]);
    expect(group([older, newer])).toHaveLength(1);
  });
  it("retains different values, doses, sides and assertion states", () => {
    expect(group([row("a"), row("b", { attrs: { value: 13, unit: "mm" } })])).toHaveLength(2);
    expect(group([row("a"), row("b", { attrs: { dose: 20 } })])).toHaveLength(2);
    expect(group([row("a"), row("b", { attrs: { side: "right" } })])).toHaveLength(2);
    expect(group([row("a"), row("b", {}, { assertion: "negated" })])).toHaveLength(2);
    expect(group([row("a"), row("b", {}, { temporalStatus: "planned" })])).toHaveLength(2);
  });
  it("retains repeated measurements at different dates", () => {
    expect(group([row("a"), row("b", { docDate: "2024-01-02" })])).toHaveLength(2);
  });
  it("falls back to normalized labels and ignores source-only metadata", () => {
    const a = row("a", {
      entityId: null,
      labelEn: " TEST metric ",
      attrs: { value: 12, unit: "mm", sourceTitle: "First" },
    });
    const b = row("b", {
      entityId: null,
      labelEn: "test metric",
      attrs: { unit: "mm", value: 12, sourceTitle: "Second" },
    });
    expect(group([a, b])).toHaveLength(1);
  });
  it("never groups unrelated entities or distinct reaction details", () => {
    expect(group([row("a"), row("b", { entityId: "other" })])).toHaveLength(2);
    expect(
      group([
        row("a", { kind: "allergy", attrs: { reaction: "itching" } }),
        row("b", { kind: "allergy", attrs: { reaction: "swelling" } }),
      ]),
    ).toHaveLength(2);
  });
  it("keeps composed claims separate and drops unsupported lines", () => {
    expect(
      group([row("a", {}, { kind: "composed" }), row("b", {}, { kind: "composed" })]),
    ).toHaveLength(2);
    expect(group([row("a", {}, { validation: { support: "unsupported" } })])).toEqual([]);
  });
  it("does not mutate source arrays", () => {
    const rows = [row("a"), row("b")];
    group(rows);
    expect(rows.map((item) => item.fact.id)).toEqual(["a", "b"]);
  });
  it("preserves separate numeric series from the same source fact", () => {
    const items = [
      { ...row("a"), series: "first", value: 120 },
      { ...row("a"), series: "second", value: 80 },
    ];
    expect(
      groupEvidence(
        items,
        (item) => item.line,
        (item) => item.fact,
        (item) => [item.series, item.value],
      ),
    ).toHaveLength(2);
  });
  it("retains clinical details before the final source separator", () => {
    expect(
      group([
        row("a", {}, { text: "Test metric · right 12 mm · First letter" }),
        row("b", {}, { text: "Test metric · left 12 mm · Second letter" }),
      ]),
    ).toHaveLength(2);
  });
});
