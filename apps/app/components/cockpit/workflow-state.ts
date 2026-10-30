import type { Card, OpenQuestion } from "@medlyn/engine/contracts";

export function questionStatus(question: OpenQuestion, card?: Card) {
  if (question.kind !== "missing") return question.kind;
  return card?.availability === "not_documented" ? "not_documented" : "unavailable";
}
