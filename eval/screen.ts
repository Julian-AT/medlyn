import type { Card, Claim } from "@medlyn/engine/contracts";
import { LensEvent, Screen } from "@medlyn/engine/contracts";
import { required } from "../packages/engine/required.ts";
export async function collectScreen(events: AsyncIterable<unknown>): Promise<Screen> {
  let screen: Screen | undefined;
  let completed = false;
  const received = new Set<string>();
  const pending: Array<{
    cardId: string;
    headline: Claim;
  }> = [];
  for await (const value of events) {
    const event = LensEvent.parse(value);
    if (completed) throw new Error("Lens emitted an event after done");
    if (event.type === "error") throw new Error(`Lens error: ${event.message}`);
    if (event.type === "situation") {
      if (screen) throw new Error("Lens emitted two situation events");
      screen = {
        lensKey: event.lensKey,
        patient: event.patient,
        situation: event.situation,
        window: event.window,
        critical: [],
        sections: event.sectionTitles.map((s) => ({ ...s, cards: [] })),
        findings: [],
        openQuestions: [],
        timings: { planMs: 0, totalMs: 0, cached: false },
      };
      continue;
    }
    if (!screen) throw new Error("Lens emitted content before situation");
    if (event.type === "section") {
      received.add(event.section.id);
      const index = screen.sections.findIndex((s) => s.id === event.section.id);
      if (index < 0) screen.sections.push(event.section);
      else screen.sections[index] = event.section;
    }
    if (event.type === "headline") pending.push(event);
    if (event.type === "findings") {
      screen.critical = event.critical;
      screen.findings = event.findings;
      screen.openQuestions = event.openQuestions;
    }
    if (event.type === "done") {
      screen.timings = event.timings;
      completed = true;
    }
  }
  if (!screen || !completed) throw new Error("Lens stream ended without a complete screen");
  for (const item of pending) {
    const card = cards(screen).find((c) => c.id === item.cardId);
    if (!card) throw new Error(`Headline references missing card ${item.cardId}`);
    card.headline = item.headline;
  }
  if (screen.sections.some((section) => !received.has(section.id)))
    throw new Error("Lens completed with missing advertised sections");
  if (
    cards(screen).some((c) => c.review) ||
    screen.findings.some((f) => f.review) ||
    screen.openQuestions.some((q) => q.review)
  ) {
    throw new Error("Evaluation requires an empty review layer");
  }
  return Screen.parse(screen);
}
export function cards(screen: Screen): Card[] {
  return screen.sections.flatMap((s) => s.cards);
}
function showable(claim: Claim): boolean {
  return (
    claim.kind !== "annotation" &&
    (claim.validation.support === "supported" || claim.validation.support === "exempt")
  );
}
export function visibleText(screen: Screen): string {
  const sections = screen.sections.map((section) =>
    [
      section.title,
      ...section.cards.map((card) =>
        [
          `[card:${card.id}; need:${card.needId}] ${card.title}`,
          card.why,
          card.completeness === "partial" ? "Partial" : undefined,
          card.conflict === "contradicted"
            ? "Contradiction · compare sources"
            : card.conflict === "needs_clarification"
              ? "Needs clarification · compare sources"
              : undefined,
          card.headline && showable(card.headline) ? card.headline.text : undefined,
          ...card.lines
            .filter((line) => card.availability === "documented" && showable(line))
            .map(
              (line) =>
                `${line.text}${line.assertion !== "present" ? ` · ${line.assertion}` : ""}${line.temporalStatus !== "stated" ? ` · ${line.temporalStatus.replaceAll("_", " ")}` : ""} [segments:${line.segmentIds.join(",")}]`,
            ),
          card.availability === "not_documented"
            ? `Not documented as of ${screen.window.asOf}`
            : undefined,
          card.availability === "unavailable" ? "Couldn't check" : undefined,
          card.missing?.length ? `Missing: ${card.missing.join(", ")}` : undefined,
          card.searched
            ? `Searched ${card.searched.eligible} of ${card.searched.total} eligible documents`
            : undefined,
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n"),
  );
  return [
    ...sections,
    ...screen.findings.map((f) => `[${f.type}:${f.id}] ${f.title}\n${f.explanation}`),
    ...screen.openQuestions.map((q) => `[open:${q.kind}] ${q.title}`),
  ].join("\n\n");
}
export async function* readJsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = required(lines.pop());
      for (const line of lines) if (line.trim()) yield JSON.parse(line);
      if (done) break;
    }
    if (buffer.trim()) yield JSON.parse(buffer);
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
