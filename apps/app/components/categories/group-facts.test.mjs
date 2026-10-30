import { describe, expect, it } from "vitest";
import { datedRows } from "./group-facts.ts";

const row = (id, docDate, eventDate = null) => ({ fact: { id, docDate, eventDate } });
describe("timeline dates", () => {
  it("uses the document date when no event date is recorded", () => {
    expect(
      datedRows([row("b", "2021-01-01"), row("a", "2020-01-01")]).map((row) => row.fact.id),
    ).toEqual(["a", "b"]);
  });
  it("prefers event dates without changing the evidence window", () => {
    expect(
      datedRows([row("b", "2021-01-01"), row("a", "2022-01-01", "2020-01-01")]).map(
        (row) => row.fact.id,
      ),
    ).toEqual(["a", "b"]);
  });
  it("orders equal dates by stable fact id", () => {
    expect(
      datedRows([row("b", "2020-01-01"), row("a", "2020-01-01")]).map((row) => row.fact.id),
    ).toEqual(["a", "b"]);
  });
  it("does not mutate the input", () => {
    const rows = [row("b", "2021-01-01"), row("a", "2020-01-01")];
    datedRows(rows);
    expect(rows[0].fact.id).toBe("b");
  });
  it("accepts an empty timeline", () => {
    expect(datedRows([])).toEqual([]);
  });
});
