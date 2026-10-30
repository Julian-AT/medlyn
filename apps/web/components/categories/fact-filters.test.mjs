import { describe, expect, it } from "vitest";
import { filterRows } from "./fact-filters.ts";

const rows = [
  {
    fact: {
      id: "a",
      kind: "procedure",
      temporalStatus: "planned",
      assertion: "present",
      docDate: "2020-01-01",
    },
    claim: { text: "Example procedure" },
  },
  {
    fact: {
      id: "b",
      kind: "diagnosis",
      temporalStatus: "stated",
      assertion: "negated",
      docDate: "2020-02-01",
    },
    claim: { text: "Example diagnosis absent" },
  },
];

describe("fact display filters", () => {
  it("matches every search term regardless of case or surrounding whitespace", () => {
    expect(filterRows(rows, "  EXAMPLE   procedure  ", "all")).toEqual([rows[0]]);
    expect(filterRows(rows, "example unrelated", "all")).toEqual([]);
  });
  it("keeps assertion and temporal status independent", () => {
    expect(filterRows(rows, "", "planned")).toEqual([rows[0]]);
    expect(filterRows(rows, "", "negated")).toEqual([rows[1]]);
    expect(filterRows(rows, "procedure", "negated")).toEqual([]);
  });
  it("searches source dates without filtering the evidence window", () => {
    expect(filterRows(rows, "2020-02", "all")).toEqual([rows[1]]);
    expect(filterRows(rows, "", "all")).toEqual(rows);
    expect(rows.map((row) => row.fact.id)).toEqual(["a", "b"]);
  });
});
