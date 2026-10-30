import { createOpenAI } from "@ai-sdk/openai";
import { recentChats } from "@medlyn/engine/agent/chat/history";
import { agentPrompt } from "@medlyn/engine/agent/prompt";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { llmErrorDetails, usesOfficialOpenAI } from "@medlyn/engine/llm/client";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  type ModelMessage,
  stepCountIs,
  streamText,
  type ToolSet,
} from "ai";
import { z } from "zod";
import { patientEvidence } from "@/lib/patient-evidence";
import { patientIdFromRequest } from "../../../lib/active-patient.ts";
import { beforeDeadline } from "./deadline";
import { trackUiEvidence } from "./evidence";
import { conversationLensKey, historyBeforeQuestion } from "./history-view";
import { chatContext } from "./patient-context";
import { patientUiTools } from "./patient-ui-tools";
import { smallTalkResponse } from "./small-talk";
import { evidenceTools } from "./tools";
import { VISUAL_TOOLS, writeValidatedStream } from "./validated-stream";

export const runtime = "nodejs";
export const maxDuration = 120;
const Input = z.object({
  id: z.string().uuid(),
  patientId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,100}$/)
    .optional(),
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

export async function GET(request: Request) {
  try {
    return Response.json(await recentChats(patientIdFromRequest(request)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.warn("recent_chats_unavailable", {
      reason: error instanceof Error ? error.name : "Unknown",
    });
    return Response.json({ error: "Recent chats unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]);
  const parsed = Input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid chat request" }, { status: 400 });
  const { id, messages } = parsed.data;
  const patientId = patientIdFromRequest(request);
  if (parsed.data.patientId && parsed.data.patientId !== patientId)
    return Response.json(
      { error: "The active patient changed. Start a new conversation." },
      { status: 409 },
    );
  const last = messages.at(-1);
  const question = last?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (last?.role !== "user" || !question || question.length > 6000) {
    return Response.json({ error: "A user question is required" }, { status: 400 });
  }
  const greeting = smallTalkResponse(question);
  if (greeting) return greeting;
  const chip = CHIPS.find((entry) =>
    parsed.data.chipId ? entry.id === parsed.data.chipId : entry.text === question,
  );
  const model = process.env.MODEL_FAST;
  if (!model || !process.env.OPENAI_BASE_URL)
    return Response.json({ error: "Chat model unavailable" }, { status: 503 });
  try {
    const lensKey = conversationLensKey(messages.slice(0, -1), parsed.data.lensKey);
    const { window, claimIds } = await beforeDeadline(
      () => chatContext(lensKey, patientId),
      signal,
    );
    const sources = await beforeDeadline(() => patientEvidence(patientId, window), signal);
    const { tools: agentTools, evidence } = evidenceTools(window, patientId);
    const tools: ToolSet = {
      ...agentTools,
      ...trackUiEvidence(
        patientUiTools({ patientId, window, sessionId: id }),
        evidence,
        chip,
        sources,
      ),
    };
    const provider = createOpenAI({
      baseURL: process.env.OPENAI_BASE_URL,
      apiKey: process.env.OPENAI_API_KEY,
    });
    // Only text is replayed as untrusted context; patient claims require fresh tool evidence.
    const previous = historyBeforeQuestion(messages, last.id);
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
Only call tools when the user asks about the patient or a clinical task. Greetings, thanks, identity and help requests need a brief non-clinical response without tools. Use UI tools to show data visually; prefer showing over telling. For role/task requests use open_lens. For weight changes use show_lab_trend; for medication lists use show_medications; for contradictions use show_findings; for GP letters use draft_letter. UI tool outputs already contain validated templates; do not repeat their contents in prose. Use check_documented for documentation questions. Never expose internal reasoning. Previous assistant messages are conversation context only: retrieve their evidence again before making any factual claim.`,
          messages: modelMessages,
          tools,
          toolChoice: chip ? { type: "tool", toolName: "open_lens" } : "auto",
          stopWhen: [stepCountIs(6), hasToolCall(...VISUAL_TOOLS)],
          providerOptions: usesOfficialOpenAI()
            ? { openai: { reasoningEffort: "none", store: false } }
            : undefined,
          onError: ({ error }) => console.warn("chat_model_failed", llmErrorDetails(error)),
          abortSignal: signal,
          maxOutputTokens: 1600,
        });
        await writeValidatedStream(
          result.stream,
          writer,
          evidence,
          window,
          claimIds,
          patientId,
          signal,
        );
        writer.write({ type: "finish", finishReason: "stop" });
      },
      onError: (error) => {
        console.warn("chat_failed", llmErrorDetails(error));
        return "Couldn't complete the investigation. Try again.";
      },
    });
    return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("chat_context_unavailable", llmErrorDetails(error));
    return Response.json({ error: "Evidence or history unavailable. Try again." }, { status: 503 });
  }
}
