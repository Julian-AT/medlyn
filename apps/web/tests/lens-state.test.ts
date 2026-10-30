import type { LensEvent } from "@medlyn/engine/contracts";
import { mockLensEvents } from "@medlyn/engine/lens/mock";
import { describe, expect, it } from "vitest";
import {
  ageAt,
  emptyLens,
  NdjsonBuffer,
  readLensStream,
  reduceLens,
  showClaim,
} from "../lib/lens-state.ts";

const situation = required(mockLensEvents.find((event) => event.type === "situation"));
const sections = mockLensEvents.filter((event) => event.type === "section");

describe("streamed clinical lens", () => {
  it("keeps the planned section order when completions arrive in reverse order", () => {
    let state = reduceLens(emptyLens, situation);
    const order = required(state.screen).sections.map((section) => section.id);
    for (const event of [...sections].reverse()) state = reduceLens(state, event);
    expect(required(state.screen).sections.map((section) => section.id)).toEqual(order);
    expect(state.pending).toEqual([]);
  });
  it("preserves supported headlines but rejects unsupported composed text", () => {
    let state = mockLensEvents.reduce(reduceLens, emptyLens);
    const event = required(mockLensEvents.find((item) => item.type === "headline"));
    if (event.type !== "headline") throw new Error("Missing headline fixture");
    const headline = {
      ...event.headline,
      text: "An unverified conclusion",
      validation: { key: "rejected", support: "unsupported" as const },
    };
    const original = state;
    state = reduceLens(state, { ...event, headline });
    expect(state).toBe(original);
    expect(showClaim(headline)).toBe(false);
  });
  it("does not carry cards into a different evidence window", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    if (situation.type !== "situation") throw new Error("Missing situation fixture");
    const changed = reduceLens(state, {
      ...situation,
      window: { ...situation.window, asOf: "2015-06-12" },
    });
    expect(required(changed.screen).sections.every((section) => section.cards.length === 0)).toBe(
      true,
    );
  });
  it("clears old cards even when the new task uses the same evidence window", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    const changed = reduceLens(state, situation);
    expect(required(changed.screen).sections.every((section) => section.cards.length === 0)).toBe(
      true,
    );
    expect(changed.complete).toBe(false);
  });
  it("clears the previous patient, errors and completion before a new request", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    expect(reduceLens({ ...state, error: "Interrupted" }, { type: "start" })).toEqual(emptyLens);
  });
  it("rejects a done event while planned sections are missing", () => {
    const done = required(mockLensEvents.find((event) => event.type === "done"));
    const state = reduceLens(reduceLens(emptyLens, situation), done);
    expect(state.complete).toBe(false);
    expect(state.error).toContain("sections were not received");
    expect(state.pending).toEqual([]);
  });
  it("does not mark a lens complete before its findings have arrived", () => {
    const state = mockLensEvents
      .filter((event) => event.type !== "findings")
      .reduce(reduceLens, emptyLens);
    expect(state.complete).toBe(false);
    expect(state.error).toContain("Findings were not received");
  });
  it("keeps unavailable and not documented as separate card states", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    const cards = required(state.screen).sections.flatMap((section) => section.cards);
    expect(required(cards.find((card) => card.needId === "kidney_function")).availability).toBe(
      "not_documented",
    );
    expect(required(cards.find((card) => card.needId === "labs")).availability).toBe("unavailable");
  });
  it("keeps an interrupted screen and exposes the retryable error", () => {
    const state = reduceLens(reduceLens(emptyLens, situation), {
      type: "error",
      message: "Evidence service interrupted",
      retryable: true,
    });
    expect(state.screen).not.toBeNull();
    expect(state.error).toBe("Evidence service interrupted");
    expect(state.complete).toBe(false);
    expect(state.pending).toEqual([]);
  });
  it("ignores section records until the situation defines the evidence window", () => {
    expect(reduceLens(emptyLens, sections[0])).toBe(emptyLens);
  });
  it("does not duplicate a need when it moves into another section", () => {
    const state = mockLensEvents.reduce(reduceLens, emptyLens);
    const source = required(state.screen).sections.flatMap((section) => section.cards)[0];
    const destination = required(
      required(state.screen).sections.find(
        (section) => !section.cards.some((card) => card.id === source.id),
      ),
    );
    const changed = reduceLens(state, {
      type: "section",
      section: { ...destination, cards: [source] },
    });
    expect(
      required(changed.screen)
        .sections.flatMap((section) => section.cards)
        .filter((card) => card.needId === source.needId),
    ).toHaveLength(1);
  });
});

describe("NDJSON transport", () => {
  it("handles split records, multiple records, blank lines and a final unterminated line", () => {
    const buffer = new NdjsonBuffer();
    expect(buffer.push('{"type":"sit')).toEqual([]);
    expect(buffer.push('uation"}\n\n{"type":"done"}\n{"tail":')).toEqual([
      { type: "situation" },
      { type: "done" },
    ]);
    expect(buffer.push("true}", true)).toEqual([{ tail: true }]);
  });
  it("rejects malformed records instead of inventing a partial event", () => {
    expect(() => new NdjsonBuffer().push("not-json\n")).toThrow();
  });
  it("decodes a complete contract stream in arbitrary chunk lengths", () => {
    const input = mockLensEvents.map((event) => JSON.stringify(event)).join("\n");
    const buffer = new NdjsonBuffer();
    const output: LensEvent[] = [];
    for (let i = 0; i < input.length; i += 13)
      output.push(...(buffer.push(input.slice(i, i + 13)) as LensEvent[]));
    output.push(...(buffer.push("", true) as LensEvent[]));
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

function stream(events: unknown[], chunkSize = 7) {
  const bytes = new TextEncoder().encode(events.map((event) => JSON.stringify(event)).join("\n"));
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let offset = 0; offset < bytes.length; offset += chunkSize)
        controller.enqueue(bytes.slice(offset, offset + chunkSize));
      controller.close();
    },
  });
}

describe("stream lifecycle", () => {
  it("reads split UTF-8 characters and a final unterminated done record", async () => {
    const events = mockLensEvents.map((event) =>
      event.type === "situation"
        ? { ...event, situation: { ...event.situation, task: "Synthetic task · prüfen" } }
        : event,
    );
    const received: LensEvent[] = [];
    await readLensStream(stream(events, 1), (event) => received.push(event));
    expect(received).toEqual(events);
  });
  it("rejects EOF before the terminal event", async () => {
    await expect(readLensStream(stream([situation, sections[0]]), () => undefined)).rejects.toThrow(
      "interrupted",
    );
  });
  it("rejects empty or out-of-order streams", async () => {
    await expect(readLensStream(stream([]), () => undefined)).rejects.toThrow("interrupted");
    await expect(readLensStream(stream([sections[0]]), () => undefined)).rejects.toThrow(
      "out of order",
    );
  });
  it("accepts a terminal error before a situation without fabricating a screen", async () => {
    const error = { type: "error", message: "Unavailable", retryable: true } as const;
    const received: LensEvent[] = [];
    await readLensStream(stream([error]), (event) => received.push(event));
    expect(received).toEqual([error]);
  });
  it("rejects malformed contract records", async () => {
    await expect(
      readLensStream(stream([situation, { type: "section" }]), () => undefined),
    ).rejects.toThrow();
  });
});

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Missing test fixture");
  return value;
}
