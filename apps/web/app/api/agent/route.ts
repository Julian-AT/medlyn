import { createOpenAI } from "@ai-sdk/openai";
import { createUIMessageStream, createUIMessageStreamResponse, stepCountIs, streamText, tool, type ModelMessage } from "ai";
import { z } from "zod";
import { AgentTools, FactKind, type Claim } from "@medlyn/engine/contracts";
import { agentContext } from "@medlyn/engine/agent/context";
import { createAgentTools } from "@medlyn/engine/agent/tools";
import { agentPrompt } from "@medlyn/engine/agent/prompt";
import { gateAnswer } from "@medlyn/engine/agent/gate";
import { speechReceipt } from "@medlyn/engine/agent/voice";
import { validateClaims } from "@medlyn/engine/claims/validate";
import { PATIENT_ID, loadSegments } from "@medlyn/engine/store";

export const runtime = "nodejs";
export const maxDuration = 120;
const Input = z.object({
  lensKey: z.string().max(300).nullable().default(null),
  sessionId: z.string().min(1).max(200),
  question: z.string().max(3000).optional(),
  spoken: z.boolean().default(false),
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), parts: z.array(z.object({ type: z.string(), text: z.string().optional() }).passthrough()) }).passthrough()).max(60),
});

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch (error) { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = Input.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid agent request" }, { status: 400 });
  const { lensKey, sessionId, messages, spoken } = parsed.data;
  const question = parsed.data.question || [...messages].reverse().find((message) => message.role === "user")?.parts.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n");
  if (!question?.trim()) return Response.json({ error: "A question is required" }, { status: 400 });
  const model = process.env.MODEL_FAST;
  if (!model || !process.env.OPENAI_BASE_URL) return Response.json({ error: "Agent model unavailable" }, { status: 503 });
  let window;
  let knownClaimIds: string[];
  try { ({ window, claimIds: knownClaimIds } = await agentContext(lensKey)); }
  catch (error) {
    console.warn("agent_context_unavailable", { reason: error instanceof Error ? error.message : "Context unavailable" });
    return Response.json({ error: "Evidence context unavailable; refresh the situation" }, { status: 409 });
  }
  const provider = createOpenAI({ baseURL: process.env.OPENAI_BASE_URL, apiKey: process.env.OPENAI_API_KEY });
  const { implementations: execute, evidence } = createAgentTools(window);
  const tools = {
    search_facts: tool({ description: "Search facts within this evidence window", inputSchema: z.object({ query: z.string(), kinds: z.array(FactKind).nullable() }), execute: ({ query, kinds }) => execute.search_facts({ query, kinds: kinds ?? undefined }) }),
    get_passage: tool({ description: "Read an eligible source and neighboring passages", inputSchema: AgentTools.get_passage.input, execute: execute.get_passage }),
    check_documented: tool({ description: "Full absence check across every eligible document; mandatory before any absence answer", inputSchema: AgentTools.check_documented.input, execute: execute.check_documented }),
    list_findings: tool({ description: "Read adjudicated findings", inputSchema: z.object({ topic: z.string().nullable() }), execute: ({ topic }) => execute.list_findings({ topic: topic ?? undefined }) }),
    timeline: tool({ description: "Sort facts by event date for an entity, kind or label", inputSchema: AgentTools.timeline.input, execute: execute.timeline }),
    calculate: tool({ description: "Safe arithmetic; every number must occur in the supplied cited facts", inputSchema: AgentTools.calculate.input, execute: execute.calculate }),
    show_source: tool({ description: "Client: open a source already returned by an evidence tool", inputSchema: AgentTools.show_source.input }),
    add_to_letter: tool({ description: "Client: propose previously validated claim ids for the GP letter", inputSchema: AgentTools.add_to_letter.input }),
  };
  // Only the current user question is replayed. Tool evidence is rebuilt server-side per request.
  const modelMessages: ModelMessage[] = [{ role: "user", content: question }];
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "start", messageId: crypto.randomUUID() });
      const result = streamText({
        model: provider.chat(model),
        system: agentPrompt({ lensKey, sessionId, question, asOf: window.asOf, spoken, claimIds: knownClaimIds }),
        messages: modelMessages, tools, stopWhen: stepCountIs(6),
        // Reserve the sixth step for the answer instead of ending on more tool calls.
        prepareStep: ({ stepNumber }) => stepNumber >= 5 ? { toolChoice: "none" } : {},
        abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(100_000)]),
        maxOutputTokens: 1400,
      });
      let finalText = "";
      const visibleTools = new Set<string>();
      for await (const part of result.stream) {
        if (part.type === "start-step") finalText = "";
        if (part.type === "text-delta") finalText += part.text;
        if (part.type === "error") throw part.error;
        if (part.type === "tool-call") {
          if (part.toolName === "add_to_letter") {
            const input = AgentTools.add_to_letter.input.safeParse(part.input);
            if (!input.success || !input.data.claimIds.length || input.data.claimIds.some((id) => !knownClaimIds.includes(id))) continue;
          }
          if (part.toolName === "show_source") {
            const input = AgentTools.show_source.input.safeParse(part.input);
            if (!input.success || !evidence.segments.has(input.data.segmentId)) continue;
          }
          visibleTools.add(part.toolCallId);
          writer.write({ type: "tool-input-available", toolCallId: part.toolCallId, toolName: part.toolName, input: part.input });
        }
        if (part.type === "tool-result" && visibleTools.has(part.toolCallId)) {
          writer.write({ type: "tool-output-available", toolCallId: part.toolCallId, output: part.output });
        }
        if (part.type === "tool-error" && visibleTools.has(part.toolCallId)) {
          writer.write({ type: "tool-output-error", toolCallId: part.toolCallId, errorText: "Couldn't complete this check" });
        }
      }
      const segments = await loadSegments(window);
      const context = {
        patientId: PATIENT_ID, window, facts: [...evidence.facts.values()], segments,
        absenceResults: evidence.absences,
      };
      const validate = (claims: Claim[]) => validateClaims(claims, context);
      const answer = await gateAnswer(finalText, {
        factIds: [...evidence.facts.keys()],
        segmentIds: [...evidence.segments.keys()],
        absences: evidence.absences,
        facts: [...evidence.facts.values()],
        calculations: evidence.calculations,
        factSegments: Object.fromEntries(
          [...evidence.facts.values()].map((fact) => [fact.id, fact.segmentId]),
        ),
      }, window, validate, spoken);
      const speechText = answer.claims.slice(0, 2).map((claim) => claim.text.replace(/\[[^\]]+\]/g, "").trim()).join(" ");
      writer.write({ type: "data-validated", data: { claims: answer.claims, nextAction: answer.nextAction, citations: Object.fromEntries([...evidence.facts.values()].map((fact) => [fact.id, fact.segmentId]).concat([...evidence.segments.keys()].map((id) => [id, id]))), speech: speechText ? { text: speechText, receipt: speechReceipt(speechText) } : null } });
      writer.write({ type: "text-start", id: "validated-answer" });
      writer.write({ type: "text-delta", id: "validated-answer", delta: answer.claims.length ? answer.claims.map((claim) => `${claim.text} ${claim.segmentIds.map((id) => `[${id}]`).join(" ")}`).join("\n\n") : "[removed: not supported by the sources]" });
      writer.write({ type: "text-end", id: "validated-answer" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
    onError: (error) => {
      console.warn("agent_failed", { reason: error instanceof Error ? error.name : "Unknown failure" });
      return "Couldn't complete the investigation. Try again.";
    },
  });
  return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
}
