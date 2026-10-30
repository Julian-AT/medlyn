import { describe, expect, it } from "vitest";
import { arithmetic, numericValues } from "../agent/arithmetic.ts";

describe("safe arithmetic", () => {
  it.each([["2 + 3 * 4", 14], ["(12 - 4) / 2", 4], ["-.5 * -2", 1], ["12 - 24", -12]])("evaluates %s", (expression, expected) => expect(arithmetic(expression)).toBe(expected));
  it.each(["", "1/0", "0/0", "Math.max(1,2)", "process.exit()", "1;2", "2**3", "1e3", "1 2", "(1+2", "1+2)", "1,5+1", "[]", "2%1", "(".repeat(60) + "1" + ")".repeat(60)])("rejects %s", (expression) => expect(() => arithmetic(expression)).toThrow());
  it("reads fractional operands and source decimal commas consistently", () => {
    expect(numericValues(".5 + 0,5 + 12")).toEqual([0.5, 0.5, 12]);
  });
});
