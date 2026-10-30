import type { InvestigationQuestion } from "./investigation-questions";

export type InvestigationStatus = "pending" | "active" | "checked" | "failed" | "stopped";
export type InvestigationItem = InvestigationQuestion & { status: InvestigationStatus };

/** Run one checked answer at a time; an interruption leaves remaining questions pending. */
export async function runInvestigations(
  questions: InvestigationQuestion[],
  run: (text: string) => Promise<boolean>,
  active: () => boolean,
  update: (id: string, status: InvestigationStatus) => void,
) {
  for (const question of questions) {
    if (!active()) return;
    update(question.id, "active");
    const completed = await run(`Investigate: ${question.title}`);
    if (!active()) return;
    update(question.id, completed ? "checked" : "failed");
    if (!completed) return;
  }
}
