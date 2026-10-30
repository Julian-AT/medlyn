import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { describe, expect, it } from "vitest";
import { parseLensRequest } from "./request";

describe("lens request normalisation", () => {
  it.each(CHIPS)("accepts $id without requiring redundant text", (chip) => {
    expect(parseLensRequest({ chipId: chip.id })).toEqual({
      success: true,
      data: { text: chip.text, chipId: chip.id },
    });
  });
  it("keeps typed situations and request controls", () => {
    expect(
      parseLensRequest({
        text: " Dentist before a tooth extraction ",
        sessionId: "test",
        noCache: true,
      }),
    ).toEqual({
      success: true,
      data: { text: "Dentist before a tooth extraction", sessionId: "test", noCache: true },
    });
  });
  it("uses canonical chip text when supplied text disagrees", () => {
    const chip = CHIPS[0];
    expect(parseLensRequest({ chipId: chip.id, text: "A different task" })).toEqual({
      success: true,
      data: { text: chip.text, chipId: chip.id },
    });
  });
  it.each([
    null,
    [],
    {},
    { text: " " },
    { chipId: "unknown" },
    { text: 42 },
    { text: "test", asOf: "bad" },
  ])("rejects invalid input %#", (body) => expect(parseLensRequest(body).success).toBe(false));
});
