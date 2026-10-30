import { type Claim, LensEvent, type Screen } from "@medlyn/engine/contracts";

export type LensState = {
  screen: Screen | null;
  pending: string[];
  error: string | null;
  complete: boolean;
  findingsReceived: boolean;
};

export const emptyLens: LensState = {
  screen: null,
  pending: [],
  error: null,
  complete: false,
  findingsReceived: false,
};

export type LensAction = LensEvent | { type: "start" };

export function reduceLens(state: LensState, event: LensAction): LensState {
  if (event.type === "start") return { ...emptyLens };
  if (event.type === "error")
    return { ...state, pending: [], error: event.message, complete: false };
  if (event.type === "situation") {
    return {
      screen: {
        lensKey: event.lensKey,
        patient: event.patient,
        situation: event.situation,
        window: event.window,
        sections: event.sectionTitles.map((section) => ({
          ...section,
          cards: [],
        })),
        critical: [],
        findings: [],
        openQuestions: [],
        timings: { planMs: 0, totalMs: 0, cached: false },
      },
      pending: event.sectionTitles.map((section) => section.id),
      error: null,
      complete: false,
      findingsReceived: false,
    };
  }
  if (!state.screen) return state;
  const screen = state.screen;
  if (event.type === "section") {
    return {
      ...state,
      pending: state.pending.filter((id) => id !== event.section.id),
      screen: {
        ...screen,
        sections: screen.sections.map((section) =>
          section.id === event.section.id
            ? event.section
            : {
                ...section,
                cards: section.cards.filter(
                  (card) => !event.section.cards.some((arrived) => arrived.needId === card.needId),
                ),
              },
        ),
      },
    };
  }
  if (event.type === "headline") {
    if (!showClaim(event.headline)) return state;
    return {
      ...state,
      screen: {
        ...screen,
        sections: screen.sections.map((section) => ({
          ...section,
          cards: section.cards.map((card) =>
            card.id === event.cardId ? { ...card, headline: event.headline } : card,
          ),
        })),
      },
    };
  }
  if (event.type === "findings")
    return {
      ...state,
      findingsReceived: true,
      screen: {
        ...screen,
        critical: event.critical,
        findings: event.findings,
        openQuestions: event.openQuestions,
      },
    };
  if (state.pending.length)
    return {
      ...state,
      pending: [],
      error: "Some sections were not received. Retry to check all sources.",
      complete: false,
    };
  if (!state.findingsReceived)
    return {
      ...state,
      error: "Findings were not received. Retry to check all sources.",
      complete: false,
    };
  return {
    ...state,
    complete: true,
    screen: { ...screen, timings: event.timings },
  };
}

export function showClaim(claim: Claim): boolean {
  if (claim.kind === "annotation") return false;
  if (claim.kind === "boilerplate") return claim.validation.support === "exempt";
  return claim.validation.support === "supported";
}

/** Keeps incomplete NDJSON records across arbitrary network chunk boundaries. */
export class NdjsonBuffer {
  private buffer = "";
  push(chunk: string, final = false): unknown[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = final ? "" : (lines.pop() ?? "");
    return lines.filter((line) => line.trim()).map((line) => JSON.parse(line));
  }
}

export async function readLensStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: LensEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const buffer = new NdjsonBuffer();
  let started = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      for (const record of buffer.push(decoder.decode(value, { stream: !done }), done)) {
        const event = LensEvent.parse(record);
        if (event.type === "situation") started = true;
        else if (!started && event.type !== "error")
          throw new Error("The lens response arrived out of order. Retry your situation.");
        onEvent(event);
        if (event.type === "done" || event.type === "error") return;
      }
      if (done) throw new Error("The lens was interrupted. Retry to check all sections.");
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

export function ageAt(birthDate: string, asOf: string): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [asYear, asMonth, asDay] = asOf.split("-").map(Number);
  return asYear - year - Number(asMonth < month || (asMonth === month && asDay < day));
}
