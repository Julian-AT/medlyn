import type { UIMessage } from "ai";
import { toolSteps } from "./tool-progress";

const FOLLOW_UPS = {
  medications: [
    "Show the trend between medication lists",
    "Any interactions documented?",
    "Open the medication sources",
  ],
  trend: [
    "Show the dated measurements",
    "Compare the source documents",
    "What follow-up is documented?",
  ],
  findings: [
    "Investigate an open question",
    "Compare the conflicting source passages",
    "Draft the GP follow-up letter",
  ],
  letter: [
    "Show the sources for this letter",
    "Which questions remain open?",
    "Show the follow-up recommendations",
  ],
  documentation: [
    "Show the relevant source passages",
    "What follow-up is recommended?",
    "Which questions remain open?",
  ],
  default: ["Show the source passages", "Which questions remain open?", "Show the timeline"],
};

/** Fixed questions describe possible next actions, never inferred patient facts. */
export function followUpSuggestions(message: UIMessage): string[] {
  if (message.role !== "assistant") return [];
  const used = new Set(
    toolSteps(message.parts)
      .filter((step) => step.status === "complete" && !step.failed)
      .map((step) => step.name),
  );
  if (!used.size) return FOLLOW_UPS.default;
  if (used.has("draft_letter")) return FOLLOW_UPS.letter;
  if (used.has("show_medications")) return FOLLOW_UPS.medications;
  if (used.has("show_findings") || used.has("list_findings")) return FOLLOW_UPS.findings;
  if (
    used.has("show_lab_trend") ||
    used.has("calculate") ||
    used.has("timeline") ||
    used.has("show_timeline")
  )
    return FOLLOW_UPS.trend;
  if (used.has("check_documented")) return FOLLOW_UPS.documentation;
  return FOLLOW_UPS.default;
}
