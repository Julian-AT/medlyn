import type { Card, Finding, OpenQuestion } from "@medlyn/engine/contracts";

export function investigationContext(question: OpenQuestion, finding?: Finding, card?: Card) {
  const context = [question.title];
  if (finding) {
    context.push(`Finding: ${finding.id}. Use show_findings to compare its sources.`);
    context.push(
      `Passages: ${finding.passages
        .map(
          (passage) =>
            `${passage.documentId}@${passage.start}–${passage.end} (segment ${passage.segmentId})`,
        )
        .join("; ")}. Use show_passage to inspect the cited evidence.`,
    );
  } else {
    context.push(
      `Use check_documented to check completion or documentation of: ${card?.title ?? question.title}.`,
    );
  }
  context.push(
    "Keep documented facts, uncertainty and missing evidence separate. Cite the evidence and do not infer completion from a recommendation.",
  );
  return context.join("\n");
}
