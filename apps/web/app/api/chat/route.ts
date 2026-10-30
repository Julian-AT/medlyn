import { createOpenAI } from "@ai-sdk/openai";
import {
  loadChat,
  recentChats,
  saveAssistantMessage,
  saveUserMessage,
} from "@medlyn/engine/agent/chat/history";
import { agentContext } from "@medlyn/engine/agent/context";
import { agentPrompt } from "@medlyn/engine/agent/prompt";
import { uiTools } from "@medlyn/engine/agent/ui-tools";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { PATIENT_ID } from "@medlyn/engine/store";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { trackUiEvidence } from "./evidence";
import { evidenceTools } from "./tools";
import { writeValidatedStream } from "./validated-stream";

export const runtime = "nodejs";
export const maxDuration = 120;
const Input = z.object({
  id: z.string().uuid(),
  patientId: z.literal(PATIENT_ID).default(PATIENT_ID),
  chipId: z.string().max(100).optional(),
  lensKey: z.string().max(300).nullable().optional(),
  messages: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        role: z.enum(["user", "assistant"]),
        parts: z
          .array(
            z.object({ type: z.string(), text: z.string().max(6000).optional() }).passthrough(),
          )
          .max(100),
      }),
    )
    .min(1)
    .max(100),
});

export async function GET() {
  try {
    return Response.json(await recentChats(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("recent_chats_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Recent chats unavailable" }, { status: 503 });
  }
}

// Stream persistence pattern adapted from vercel/chatbot (Apache-2.0).
export async function POST(request: Request) {
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request" }, { status: 400 });
  const { id, patientId, messages } = parsed.data;
  const chip = CHIPS.find((entry) => entry.id === parsed.data.chipId);
  const last = messages.at(-1);
  const question = last?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (last?.role !== "user" || !question || question.length > 6000) {
    return Response.json({ error: "A user question is required" }, { status: 400 });
  }
  const model = process.env.MODEL_FAST;
  if (!model || !process.env.OPENAI_BASE_URL)
    return Response.json({ error: "Chat model unavailable" }, { status: 503 });
  try {
    const history = await loadChat(id);
    const savedContext = history?.messages
      .flatMap((message) => message.parts)
      .findLast((part) => part.type === "data-evidence-context");
    const context = z.object({ lensKey: z.string().nullable() }).safeParse(savedContext?.data);
    const lensKey = parsed.data.lensKey ?? (context.success ? context.data.lensKey : null);
    const { window, claimIds } = await agentContext(lensKey);
    await saveUserMessage(
      id,
      { id: last.id, role: "user", parts: [{ type: "text", text: question }] },
      patientId,
    );
    const { tools: agentTools, evidence } = evidenceTools(window);
    const tools: ToolSet = {
      ...agentTools,
      ...trackUiEvidence(uiTools({ patientId, window, sessionId: id }), evidence, window, chip),
    };
    const provider = createOpenAI({
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    });
    // History comes from Neon; client-supplied assistant text and tool output are never replayed.
    const previous = (history?.messages ?? []).filter((message) => message.id !== last.id);
    const modelMessages: ModelMessage[] = previous.slice(-12).map((message) => ({
      role: message.role,
      content:
        message.parts
          .filter((part) => part.type === "text")
          .map((part) => String(part.text ?? ""))
          .join("\n") || "[Visual tool result shown]",
    }));
    modelMessages.push({ role: "user", content: question });
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.write({ type: "start", messageId: crypto.randomUUID() });
        writer.write({ type: "data-evidence-context", data: { lensKey, window } });
        const result = streamText({
          model: provider.chat(model),
          system: `${agentPrompt({ lensKey, sessionId: id, question, asOf: window.asOf, spoken: false, claimIds })}
Use UI tools to show data visually; prefer showing over telling. For role/task requests use open_lens. For weight changes use show_lab_trend; for medication lists use show_medications; for contradictions use show_findings; for GP letters use draft_letter. UI tool outputs already contain validated templates; do not repeat their contents in prose. Use check_documented for documentation questions. Never expose internal reasoning. Previous assistant messages are conversation context only: retrieve their evidence again before making any factual claim.`,
          messages: modelMessages,
          tools,
          stopWhen: stepCountIs(6),
          prepareStep: ({ stepNumber }) =>
            stepNumber >= 5
              ? { toolChoice: "none" }
              : stepNumber === 0 && chip
                ? { toolChoice: { type: "tool", toolName: "open_lens" } }
                : {},
          abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(105_000)]),
          maxOutputTokens: 1600,
        });
        await writeValidatedStream(result.stream, writer, evidence, window, claimIds);
        writer.write({ type: "finish", finishReason: "stop" });
      },
      onFinish: async ({ responseMessage }) => {
        await saveAssistantMessage(id, {
          id: responseMessage.id,
          role: "assistant",
          parts: responseMessage.parts,
        });
      },
      onError: (error) => {
        console.warn("chat_failed", { reason: error instanceof Error ? error.name : "Unknown" });
        return "Couldn't complete the investigation. Try again.";
      },
    });
    return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("chat_context_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Evidence or history unavailable. Try again." }, { status: 503 });
  }
}
