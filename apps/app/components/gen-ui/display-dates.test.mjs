import { describe, expect, it } from "vitest";
import { displayDates } from "./display-dates.ts";

describe("rendered dates", () => {
  it("formats complete dates without changing surrounding text", () => {
    expect(displayDates("Source dated 2020-05-16; planned 2020-06-02.")).toBe(
      "Source dated 16 May 2020; planned 2 Jun 2020.",
    );
  });
  it("preserves invalid dates and partial date precision", () => {
    expect(displayDates("2020-02-30 / 2020-13-01 / 2020-05 / 2020")).toBe(
      "2020-02-30 / 2020-13-01 / 2020-05 / 2020",
    );
  });
  it("preserves an English date that is already formatted", () => {
    expect(displayDates("16 May 2020")).toBe("16 May 2020");
  });
});
