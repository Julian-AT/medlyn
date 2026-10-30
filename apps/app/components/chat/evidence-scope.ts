import { EvidenceWindow } from "@medlyn/engine/contracts";
import type { UIMessage } from "ai";
import { record, toolSteps } from "./tool-progress";

/** Counts returned evidence separately from a successful full-document check. */
export function evidenceScope(message: UIMessage) {
  if (message.role !== "assistant") return null;
  const steps = toolSteps(message.parts);
  const usedEvidence = steps.some(
    (step) => step.name !== "add_to_letter" && step.status === "complete" && !step.failed,
  );
  if (!usedEvidence) return null;
  const context = message.parts.findLast((part) => part.type === "data-evidence-context");
  if (!context || !("data" in context)) return null;
  const parsed = EvidenceWindow.safeParse(record(context.data)?.window);
  if (!parsed.success) return null;
  const window = parsed.data;
  const eligible = new Set(window.eligibleDocumentIds);
  const documents = new Set<string>();
  const facts = new Set<string>();
  let searched: number | null = null;
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const item = record(value);
    if (!item) return;
    if (typeof item.documentId === "string" && eligible.has(item.documentId))
      documents.add(item.documentId);
    const document = record(item.document);
    if (typeof document?.id === "string" && eligible.has(document.id)) documents.add(document.id);
    if (typeof item.factId === "string") facts.add(item.factId);
    if (Array.isArray(item.factIds))
      for (const id of item.factIds) if (typeof id === "string") facts.add(id);
    if (Array.isArray(item.facts))
      for (const fact of item.facts) {
        const id = record(fact)?.id;
        if (typeof id === "string") facts.add(id);
      }
    Object.values(item).forEach(visit);
  };
  for (const step of steps) {
    if (step.status !== "complete" || step.failed) continue;
    visit(step.output);
    if (step.name !== "check_documented") continue;
    const coverage = record(step.output?.searched);
    if (
      (step.output?.status === "documented" || step.output?.status === "not_documented") &&
      coverage?.asOf === window.asOf &&
      coverage.eligible === eligible.size
    )
      searched = eligible.size;
  }
  return {
    asOf: window.asOf,
    eligible: eligible.size,
    retrievedDocuments: documents.size,
    retrievedFacts: facts.size,
    searched,
  };
}
