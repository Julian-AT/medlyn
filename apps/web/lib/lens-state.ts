import type { Claim, LensEvent, Screen } from "@medlyn/engine/contracts";

export type LensState = {
  screen: Screen | null;
  pending: string[];
  error: string | null;
  complete: boolean;
};

export const emptyLens: LensState = {
  screen: null,
  pending: [],
  error: null,
  complete: false,
};

export function reduceLens(state: LensState, event: LensEvent): LensState {
  if (event.type === "error") return { ...state, error: event.message, complete: true };
  if (event.type === "situation") {
    return {
      screen: {
        lensKey: event.lensKey,
        patient: event.patient,
        situation: event.situation,
        window: event.window,
        sections: event.sectionTitles.map((section) => ({
          ...section,
          cards:
            state.screen?.window.asOf === event.window.asOf &&
            state.screen.window.corpusRevision === event.window.corpusRevision &&
            JSON.stringify(state.screen.window.eligibleDocumentIds) ===
              JSON.stringify(event.window.eligibleDocumentIds)
              ? (state.screen.sections.find((previous) => previous.id === section.id)?.cards ?? [])
              : [],
        })),
        critical: [],
        findings: [],
        openQuestions: [],
        timings: { planMs: 0, totalMs: 0, cached: false },
      },
      pending: event.sectionTitles.map((section) => section.id),
      error: null,
      complete: false,
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
      screen: {
        ...screen,
        critical: event.critical,
        findings: event.findings,
        openQuestions: event.openQuestions,
      },
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

export function ageAt(birthDate: string, asOf: string): number {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [asYear, asMonth, asDay] = asOf.split("-").map(Number);
  return asYear - year - Number(asMonth < month || (asMonth === month && asDay < day));
}
