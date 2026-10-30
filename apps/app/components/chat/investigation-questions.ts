import { OpenQuestion } from "@medlyn/engine/contracts";
import type { UIMessage } from "ai";
import { record, toolSteps } from "./tool-progress";

export type InvestigationQuestion = Pick<OpenQuestion, "id" | "title">;

/** Only server-returned open questions become queued investigations. */
export function investigationQuestions(message: UIMessage): InvestigationQuestion[] {
  if (message.role !== "assistant") return [];
  const questions = new Map<string, InvestigationQuestion>();
  for (const step of toolSteps(message.parts)) {
    if (step.name !== "open_lens" || step.status !== "complete" || step.failed) continue;
    const output = record(step.output);
    if (!Array.isArray(output?.openQuestions)) continue;
    for (const value of output.openQuestions) {
      const parsed = OpenQuestion.safeParse(value);
      if (parsed.success && parsed.data.title.trim())
        questions.set(parsed.data.id, { id: parsed.data.id, title: parsed.data.title });
    }
  }
  return [...questions.values()];
}
