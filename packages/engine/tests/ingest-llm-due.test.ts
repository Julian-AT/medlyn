import { describe, expect, it } from "vitest";
import { deriveDueDate } from "../ingest/due.ts";

describe("relative due dates", () => {
  it("computes approximate month follow-ups without day overflow", () => {
    expect(deriveDueDate("2024-01-31", "in 1 Monat")).toEqual({ dueDate: "2024-02", datePrecision: "approx" });
    expect(deriveDueDate("2024-12-20", "in zwei Monaten")).toEqual({ dueDate: "2025-02", datePrecision: "approx" });
    expect(deriveDueDate("2024-02-29", "nach einem Jahr")).toEqual({ dueDate: "2025-02", datePrecision: "approx" });
  });
  it("computes days and weeks across a leap day", () => {
    expect(deriveDueDate("2024-02-25", "in 1 Woche")?.dueDate).toBe("2024-03-03");
    expect(deriveDueDate("2024-02-28", "in 2 Tagen")?.dueDate).toBe("2024-03-01");
  });
  it("accepts valid explicit dates and rejects missing, ambiguous and invalid dates", () => {
    expect(deriveDueDate("2024-01-01", "am 15.05.2024")).toEqual({ dueDate: "2024-05-15", datePrecision: "day" });
    expect(deriveDueDate("2024-01-01", "31.02.2024")).toBeNull();
    expect(deriveDueDate("2024-02-30", "in 2 Tagen")).toBeNull();
    expect(deriveDueDate("2024-01-01", "regelmäßig")).toBeNull();
    expect(deriveDueDate("2024-01-01", null)).toBeNull();
  });
});
