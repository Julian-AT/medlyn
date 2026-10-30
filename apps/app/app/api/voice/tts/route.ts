import { verifySpeechReceipt } from "@medlyn/engine/agent/voice";
import { z } from "zod";

export const runtime = "nodejs";
const Input = z.object({
  text: z.string().trim().min(1).max(4000),
  receipt: z.string().max(16_000),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = Input.safeParse(body);
  if (!parsed.success)
    return Response.json({ error: "Text and validation receipt are required" }, { status: 400 });
  const { text, receipt } = parsed.data;
  if (!verifySpeechReceipt(text, receipt))
    return Response.json({ error: "Speech requires validated text" }, { status: 403 });
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  const voiceId = process.env.FISH_AUDIO_VOICE_ID;
  if (!apiKey || !voiceId) return Response.json({ error: "Voice unavailable" }, { status: 503 });
  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, reference_id: voiceId, format: "mp3", latency: "balanced" }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    if (!response.ok || !response.body) {
      console.warn("fish_tts_unavailable", { status: response.status });
      return Response.json({ error: "Voice unavailable" }, { status: 502 });
    }
    return new Response(response.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.warn("fish_tts_failed", {
      reason: error instanceof Error ? error.name : "Unknown failure",
    });
    return Response.json({ error: "Voice unavailable" }, { status: 502 });
  }
}
