import type { Card, Finding, OpenQuestion } from "@medlyn/engine/contracts";

export function investigationContext(question: OpenQuestion, finding?: Finding, card?: Card) {
  const context = [question.title];
  if (finding) {
    context.push(
      "Compare every source passage for this finding and explain what remains uncertain.",
    );
  } else {
    context.push(
      `Check all eligible documents for documentation of: ${card?.title ?? question.title}.`,
    );
  }
  context.push(
    "Keep documented facts, uncertainty and missing evidence separate. Cite the evidence and do not infer completion from a recommendation.",
  );
  return context.join("\n");
}
