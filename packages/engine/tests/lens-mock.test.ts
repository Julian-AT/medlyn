import { describe, expect, it } from "vitest";
import { LensEvent, Screen } from "../contracts.ts";
import { mockLensEvents, mockLensStream } from "../lens/mock.ts";

const byType = <T extends LensEvent["type"]>(type: T) =>
  mockLensEvents.filter((e): e is Extract<LensEvent, { type: T }> => e.type === type);

describe("situation 1 mock", () => {
  it("parses against the contract", () => {
    for (const event of mockLensEvents) expect(() => LensEvent.parse(event)).not.toThrow();
  });

  it("follows the stream order: situation, sections, headlines, findings, done", () => {
    const rank = { situation: 0, section: 1, headline: 2, findings: 3, done: 4, error: 5 };
    const ranks = mockLensEvents.map((e) => rank[e.type]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(mockLensEvents.at(0)?.type).toBe("situation");
    expect(mockLensEvents.at(-1)?.type).toBe("done");
  });

  it("sends every announced section exactly once", () => {
    const [situation] = byType("situation");
    const sent = byType("section").map((e) => e.section.id);
    expect([...sent].sort()).toEqual(situation.sectionTitles.map((s) => s.id).sort());
  });

  it("only references cards and findings that exist", () => {
    const cardIds = new Set(byType("section").flatMap((e) => e.section.cards.map((c) => c.id)));
    const [{ findings, openQuestions, critical }] = byType("findings");
    const findingIds = new Set(findings.map((f) => f.id));

    for (const { cardId } of byType("headline")) expect(cardIds).toContain(cardId);
    for (const id of critical) expect(cardIds).toContain(id);
    for (const card of byType("section").flatMap((e) => e.section.cards)) {
      for (const id of card.findingIds) expect(findingIds).toContain(id);
    }
    for (const q of openQuestions) {
      if (q.findingId) expect(findingIds).toContain(q.findingId);
      if (q.cardId) expect(cardIds).toContain(q.cardId);
    }
  });

  it("assembles into a valid Screen", () => {
    const [situation] = byType("situation");
    const [findings] = byType("findings");
    const [done] = byType("done");
    const sections = byType("section").map((e) => e.section);
    const order = situation.sectionTitles.map((s) => s.id);
    sections.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    expect(() =>
      Screen.parse({
        lensKey: situation.lensKey,
        patient: situation.patient,
        situation: situation.situation,
        window: situation.window,
        critical: findings.critical,
        sections,
        findings: findings.findings,
        openQuestions: findings.openQuestions,
        timings: done.timings,
      }),
    ).not.toThrow();
  });

  it("streams every event", async () => {
    const streamed: LensEvent[] = [];
    for await (const event of mockLensStream(1000)) streamed.push(event);
    expect(streamed).toEqual(mockLensEvents);
  });
});
