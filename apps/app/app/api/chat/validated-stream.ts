import { gateAnswer } from "@medlyn/engine/agent/gate";
import type { AgentEvidence } from "@medlyn/engine/agent/tools";
import { speechReceipt } from "@medlyn/engine/agent/voice";
import { validateClaims } from "@medlyn/engine/claims/validate";
import { AgentTools, type EvidenceWindow } from "@medlyn/engine/contracts";
import { llmErrorDetails } from "@medlyn/engine/llm/client";
import { loadSegments, PATIENT_ID } from "@medlyn/engine/store";
import type { TextStreamPart, ToolSet, UIMessageStreamWriter } from "ai";

export async function writeValidatedStream(
  stream: AsyncIterable<TextStreamPart<ToolSet>>,
  writer: UIMessageStreamWriter,
  evidence: AgentEvidence,
  window: EvidenceWindow,
  knownClaimIds: string[],
  patientId = PATIENT_ID,
) {
  let text = "";
  let step = 0;
  let spokenClaims = 0;
  const visibleTools = new Set<string>();
  const emittedClaims = new Set<string>();
  const flush = async () => {
    if (!text.trim() && !evidence.absences.length && !evidence.calculations.length) return;
    const facts = [...evidence.facts.values()];
    const answer = await gateAnswer(
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
      (claims) =>
        validateClaims(claims, {
          patientId,
          window,
          facts,
          segments: loadSegmentsForValidation,
          absenceResults: evidence.absences,
        }),
    );
    const claims = answer.claims.filter((claim) => !emittedClaims.has(claim.id));
    text = "";
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
  const loadSegmentsForValidation = await loadSegments(window, patientId);
  for await (const part of stream) {
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
      writer.write({
        type: "tool-input-available",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input,
      });
    }
    if (part.type === "tool-result" && visibleTools.has(part.toolCallId)) {
      writer.write({
        type: "tool-output-available",
        toolCallId: part.toolCallId,
        output: part.output,
      });
    }
    if (part.type === "tool-error" && visibleTools.has(part.toolCallId)) {
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
  if (!emittedClaims.size && !visibleTools.size) {
    writer.write({ type: "text-start", id: "no-support" });
    writer.write({
      type: "text-delta",
      id: "no-support",
      delta: "Couldn't produce a supported answer. Try a more specific question.",
    });
    writer.write({ type: "text-end", id: "no-support" });
  }
}
