import { isToolUIPart, type UIMessage } from "ai";

type Part = UIMessage["parts"][number];
export const TOOL_LABELS: Record<string, [string, string]> = {
  search_facts: ["Search facts", "Searched facts"],
  get_passage: ["Read source context", "Read source context"],
  check_documented: ["Check documentation", "Checked documentation"],
  list_findings: ["Compare sources", "Compared sources"],
  timeline: ["Read dated facts", "Read dated facts"],
  calculate: ["Check calculation", "Checked calculation"],
  show_source: ["Open source passage", "Source passage ready"],
  add_to_letter: ["Prepare letter selection", "Letter selection ready"],
  open_lens: ["Prepare situation", "Prepared situation"],
  show_patient_summary: ["Read patient overview", "Read patient overview"],
  show_medications: ["Read medication lists", "Read medication lists"],
  show_lab_trend: ["Read measurements", "Read measurements"],
  show_timeline: ["Build timeline", "Built timeline"],
  show_findings: ["Compare sources", "Compared sources"],
  show_passage: ["Read source passage", "Read source passage"],
  draft_letter: ["Prepare GP letter", "Prepared GP letter"],
};

export function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function toolSteps(parts: Part[]) {
  return parts
    .filter(isToolUIPart)
    .filter((part) => part.type !== "dynamic-tool")
    .map((part) => {
      const name = part.type.slice(5);
      const output = "output" in part ? record(part.output) : null;
      const failed =
        part.state === "output-error" ||
        part.state === "output-denied" ||
        (part.state === "output-available" && output?.status === "unavailable");
      const complete = part.state === "output-available";
      const clientReady = name === "show_source" || name === "add_to_letter";
      const status = complete || failed || clientReady ? "complete" : "active";
      const labels = TOOL_LABELS[name] ?? ["Check evidence", "Checked evidence"];
      return {
        id: part.toolCallId,
        name,
        output,
        failed,
        status,
        label: failed ? "Couldn't complete check" : labels[status === "active" ? 0 : 1],
      } as const;
    });
}

export function progressSummary(parts: Part[], factIds: string[]) {
  const steps = toolSteps(parts);
  const documents = new Set<string>();
  let searched = 0;
  for (const step of steps) {
    if (step.status !== "complete" || step.failed) continue;
    if (step.name === "check_documented") {
      const count = record(step.output?.searched)?.eligible;
      if (typeof count === "number" && Number.isSafeInteger(count) && count >= 0)
        searched = Math.max(searched, count);
    }
    if (step.name === "search_facts" && Array.isArray(step.output?.facts)) {
      for (const fact of step.output.facts) {
        const id = record(fact)?.documentId;
        if (typeof id === "string") documents.add(id);
      }
    }
  }
  const documentCount = searched || documents.size;
  const facts = new Set(factIds).size;
  const completed = steps.filter((step) => step.status === "complete" && !step.failed).length;
  const failed = steps.filter((step) => step.failed).length;
  const sourceLabel = documentCount
    ? `${searched ? "Searched" : "Retrieved from"} ${documentCount} ${documentCount === 1 ? "document" : "documents"}`
    : `${completed} ${completed === 1 ? "check" : "checks"} completed`;
  const failureLabel = failed
    ? ` · ${failed} ${failed === 1 ? "check" : "checks"} unavailable`
    : "";
  return `${sourceLabel}${facts ? ` · checked ${facts} ${facts === 1 ? "fact" : "facts"}` : ""}${failureLabel}`;
}
