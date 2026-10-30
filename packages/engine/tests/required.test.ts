import { describe, expect, it } from "vitest";
import { required } from "../required.ts";

describe("required values", () => {
  it.each([0, false, ""])("preserves the present value %s", (value) => {
    expect(required(value)).toBe(value);
  });
  it.each([null, undefined])("rejects the missing value %s", (value) => {
    expect(() => required(value)).toThrow("Required value is missing");
  });
});
