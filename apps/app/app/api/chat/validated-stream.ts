import { gateAnswer } from "@medlyn/engine/agent/gate";
import type { AgentEvidence } from "@medlyn/engine/agent/tools";
import { speechReceipt } from "@medlyn/engine/agent/voice";
import { validateClaims } from "@medlyn/engine/claims/validate";
import { AgentTools, type EvidenceWindow } from "@medlyn/engine/contracts";
import { llmErrorDetails } from "@medlyn/engine/llm/client";
import { loadSegments, PATIENT_ID } from "@medlyn/engine/store";
import type { TextStreamPart, ToolSet, UIMessageStreamWriter } from "ai";
import { beforeDeadline } from "./deadline.ts";

export const VISUAL_TOOLS = [
  "open_lens",
  "show_patient_summary",
  "show_medications",
  "show_lab_trend",
  "show_timeline",
  "show_findings",
  "draft_letter",
];

export async function writeValidatedStream(
  stream: AsyncIterable<TextStreamPart<ToolSet>>,
  writer: UIMessageStreamWriter,
  evidence: AgentEvidence,
  window: EvidenceWindow,
  knownClaimIds: string[],
  patientId = PATIENT_ID,
  signal = AbortSignal.timeout(45_000),
) {
  let text = "";
  let step = 0;
  let spokenClaims = 0;
  const visibleTools = new Set<string>();
  const emittedClaims = new Set<string>();
  const pendingTools = new Set<string>();
  let hasView = false;
  let hasClientAction = false;
  const flush = async () => {
    if (hasView) {
      text = "";
      return;
    }
    if (!text.trim() && !evidence.absences.length && !evidence.calculations.length) return;
    const facts = [...evidence.facts.values()];
    const validationSignal = AbortSignal.any([signal, AbortSignal.timeout(8000)]);
    const answer = await beforeDeadline(
      () =>
        gateAnswer(
          text,
          {
            factIds: [...evidence.facts.keys()],
            segmentIds: [...evidence.segments.keys()],
            facts,
            absences: evidence.absences,
            calculations: evidence.calculations,
            factSegments: Object.fromEntries(facts.map((fact) => [fact.id, fact.segmentId])),
          },
          window,
          async (claims) =>
            validateClaims(claims, {
              patientId,
              window,
              facts,
              segments: await loadSegments(window, patientId),
              absenceResults: evidence.absences,
            }),
        ),
      validationSignal,
    ).catch((error: unknown) => {
      console.warn("chat_validation_unavailable", llmErrorDetails(error));
      return null;
    });
    text = "";
    if (!answer) return;
    const claims = answer.claims.filter((claim) => !emittedClaims.has(claim.id));
    if (!claims.length) return;
    for (const claim of claims) emittedClaims.add(claim.id);
    const speechClaims = claims.slice(0, Math.max(0, 2 - spokenClaims));
    spokenClaims += speechClaims.length;
    const speechText = speechClaims.map((claim) => claim.text).join(" ");
    writer.write({
      type: "data-validated",
      data: {
        claims,
        nextAction: answer.nextAction,
        speech: speechText ? { text: speechText, receipt: speechReceipt(speechText) } : null,
      },
    });
    const id = `validated-${step++}`;
    writer.write({ type: "text-start", id });
    writer.write({ type: "text-delta", id, delta: claims.map((claim) => claim.text).join("\n\n") });
    writer.write({ type: "text-end", id });
  };
  const iterator = stream[Symbol.asyncIterator]();
  let ended = false;
  try {
    while (true) {
      const next = await beforeDeadline(() => iterator.next(), signal);
      if (next.done) {
        ended = true;
        break;
      }
      const part = next.value;
      if (part.type === "start-step") writer.write({ type: "start-step" });
      if (part.type === "text-delta") text += part.text;
      if (part.type === "error") throw part.error;
      if (part.type === "tool-call") {
        if (part.toolName === "add_to_letter") {
          const parsed = AgentTools.add_to_letter.input.safeParse(part.input);
          if (
            !parsed.success ||
            !parsed.data.claimIds.length ||
            parsed.data.claimIds.some((id) => !knownClaimIds.includes(id))
          )
            continue;
        }
        if (part.toolName === "show_source") {
          const parsed = AgentTools.show_source.input.safeParse(part.input);
          if (!parsed.success || !evidence.segments.has(parsed.data.segmentId)) continue;
        }
        visibleTools.add(part.toolCallId);
        if (part.toolName === "show_source" || part.toolName === "add_to_letter") {
          hasClientAction = true;
        } else {
          pendingTools.add(part.toolCallId);
        }
        writer.write({
          type: "tool-input-available",
          toolCallId: part.toolCallId,
          toolName: part.toolName,
          input: part.input,
        });
      }
      if (part.type === "tool-result" && visibleTools.has(part.toolCallId)) {
        pendingTools.delete(part.toolCallId);
        if (VISUAL_TOOLS.includes(part.toolName)) hasView = true;
        writer.write({
          type: "tool-output-available",
          toolCallId: part.toolCallId,
          output: part.output,
        });
      }
      if (part.type === "tool-error" && visibleTools.has(part.toolCallId)) {
        pendingTools.delete(part.toolCallId);
        console.warn("chat_tool_failed", { tool: part.toolName, ...llmErrorDetails(part.error) });
        writer.write({
          type: "tool-output-error",
          toolCallId: part.toolCallId,
          errorText: "Couldn't complete this check",
        });
      }
      if (part.type === "finish-step") {
        await flush();
        writer.write({ type: "finish-step" });
      }
    }
    await flush();
  } catch (error) {
    console.warn("chat_stream_unavailable", llmErrorDetails(error));
  } finally {
    if (!ended)
      void iterator.return?.().catch((error: unknown) => {
        console.warn("chat_stream_cleanup_failed", llmErrorDetails(error));
      });
    for (const toolCallId of pendingTools)
      writer.write({
        type: "tool-output-error",
        toolCallId,
        errorText: "Couldn't complete this check. Try again.",
      });
  }
  if (hasView) writer.write({ type: "data-response-status", data: { status: "view" } });
  if (!emittedClaims.size && !hasView && !hasClientAction) {
    writer.write({ type: "text-start", id: "no-support" });
    writer.write({
      type: "text-delta",
      id: "no-support",
      delta: "Couldn't produce a supported answer. Try a more specific question.",
    });
    writer.write({ type: "text-end", id: "no-support" });
  }
}
