import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { speechReceipt, verifySpeechReceipt } from "../agent/voice.ts";

const prior = process.env.OPENAI_API_KEY;
beforeAll(() => { process.env.OPENAI_API_KEY = "synthetic-test-signing-key"; });
afterAll(() => { if (prior === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = prior; });

describe("validated speech receipts", () => {
  it("binds the receipt to the exact validated text", () => {
    const receipt = speechReceipt("Synthetic validated sentence.", 1000);
    expect(verifySpeechReceipt("Synthetic validated sentence.", receipt, 2000)).toBe(true);
    expect(verifySpeechReceipt("Changed sentence.", receipt, 2000)).toBe(false);
  });
  it("rejects expiry, tampering and malformed receipts", () => {
    const receipt = speechReceipt("Synthetic sentence.", 1000);
    expect(verifySpeechReceipt("Synthetic sentence.", receipt, 601001)).toBe(false);
    expect(verifySpeechReceipt("Synthetic sentence.", `${receipt}x`, 2000)).toBe(false);
    expect(verifySpeechReceipt("Synthetic sentence.", "invalid", 2000)).toBe(false);
  });
});
