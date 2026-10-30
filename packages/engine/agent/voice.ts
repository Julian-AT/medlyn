import { createHmac, timingSafeEqual } from "node:crypto";

function signature(payload: string): string {
  const secret = process.env.OPENAI_API_KEY || process.env.FISH_AUDIO_API_KEY;
  if (!secret) throw new Error("Voice receipt signing is unavailable");
  return createHmac("sha256", secret).update(`medlyn-validated-speech:${payload}`).digest("base64url");
}

/** Bind speech to text that has already passed the shared claim boundary. */
export function speechReceipt(text: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ text, expires: now + 10 * 60_000 })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySpeechReceipt(text: string, receipt: string, now = Date.now()): boolean {
  try {
    const [payload, mac, extra] = receipt.split(".");
    if (!payload || !mac || extra) return false;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(mac);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!decoded || typeof decoded !== "object") return false;
    const record = decoded as Record<string, unknown>;
    return record.text === text && typeof record.expires === "number" && record.expires > now;
  } catch (error) {
    console.warn("speech_receipt_rejected", { reason: error instanceof Error ? error.name : "Invalid receipt" });
    return false;
  }
}
