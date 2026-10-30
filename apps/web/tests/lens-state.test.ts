import { describe, expect, it } from "vitest";
import type { LensEvent } from "@medlyn/engine/contracts";
import { mockLensEvents } from "@medlyn/engine/lens/mock";
import { ageAt, emptyLens, NdjsonBuffer, reduceLens, showClaim } from "../lib/lens-state.ts";

const situation = mockLensEvents.find((event) => event.type === "situation")!;
const sections = mockLensEvents.filter((event) => event.type === "section");

describe("streamed clinical lens", () => {
  it("keeps the planned section order when completions arrive in reverse order", () => {
    let state = reduceLens(emptyLens, situation);
    const order = state.screen!.sections.map((section) => section.id);
    for (const event of [...sections].reverse()) state = reduceLens(state, event);
    expect(state.screen!.sections.map((section) => section.id)).toEqual(order);
    expect(state.pending).toEqual([]);
  });
  it("preserves supported headlines but rejects unsupported composed text", () => {
    let state = mockLensEvents.reduce(reduceLens, emptyLens);
    const event = mockLensEvents.find((item) => item.type === "headline")!;
    if (event.type !== "headline") throw new Error("Missing headline fixture");
    const headline = { ...event.headline, text: "An unverified conclusion", validation: { key: "rejected", support: "unsupported" as const } };
    const original = state;
    state = reduceLens(state, { ...event, headline });
    expect(state).toBe(original);
    expect(showClaim(headline)).toBe(false);
  });
  it("does not carry cards into a different evidence window", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    if (situation.type !== "situation") throw new Error("Missing situation fixture");
    const changed = reduceLens(state, { ...situation, window: { ...situation.window, asOf: "2015-06-12" } });
    expect(changed.screen!.sections.every((section) => section.cards.length === 0)).toBe(true);
  });
  it("preserves card identity for a role morph in the same evidence window", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    const changed = reduceLens(state, situation);
    expect(changed.screen!.sections.flatMap((section) => section.cards).map((card) => card.needId)).toEqual(state.screen!.sections.flatMap((section) => section.cards).map((card) => card.needId));
    expect(changed.complete).toBe(false);
  });
  it("keeps unavailable and not documented as separate card states", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    const cards = state.screen!.sections.flatMap((section) => section.cards);
    expect(cards.find((card) => card.needId === "kidney_function")!.availability).toBe("not_documented");
    expect(cards.find((card) => card.needId === "labs")!.availability).toBe("unavailable");
  });
  it("keeps an interrupted screen and exposes the retryable error", () => {
    const state = reduceLens(reduceLens(emptyLens, situation), { type: "error", message: "Evidence service interrupted", retryable: true });
    expect(state.screen).not.toBeNull();
    expect(state.error).toBe("Evidence service interrupted");
    expect(state.complete).toBe(true);
  });
  it("ignores section records until the situation defines the evidence window", () => {
    expect(reduceLens(emptyLens, sections[0])).toBe(emptyLens);
  });
  it("does not duplicate a need when it moves into another section", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    const source = state.screen!.sections.flatMap((section) => section.cards)[0];
    const destination = state.screen!.sections.find((section) => !section.cards.some((card) => card.id === source.id))!;
    const changed = reduceLens(state, { type: "section", section: { ...destination, cards: [source] } });
    expect(changed.screen!.sections.flatMap((section) => section.cards).filter((card) => card.needId === source.needId)).toHaveLength(1);
  });
});

describe("NDJSON transport", () => {
  it("handles split records, multiple records, blank lines and a final unterminated line", () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('{"type":"sit')).toEqual([]);
    expect(buffer.push('uation"}\n\n{"type":"done"}\n{"tail":')).toEqual([{ type: "situation" }, { type: "done" }]);
    expect(buffer.push('true}', true)).toEqual([{ tail: true }]);
  });
  it("rejects malformed records instead of inventing a partial event", () => {
    expect(() => new NdjsonBuffer().push("not-json\n")).toThrow();
  });
  it("decodes a complete contract stream in arbitrary chunk lengths", () => {
    const input = mockLensEvents.map((event) => JSON.stringify(event)).join("\n");
    const buffer = new NdjsonBuffer();
    const output: LensEvent[] = [];
    for (let i = 0; i < input.length; i += 13) output.push(...buffer.push(input.slice(i, i + 13)) as LensEvent[]);
    output.push(...buffer.push("", true) as LensEvent[]);
    expect(output).toEqual(mockLensEvents);
  });
});

describe("age at the evidence date", () => {
  it("uses the date of the evidence window rather than today's date", () => {
    expect(ageAt("1959-03-15", "2016-04-15")).toBe(57);
    expect(ageAt("1959-03-15", "2016-03-14")).toBe(56);
    expect(ageAt("1959-03-15", "2016-03-15")).toBe(57);
  });
});
