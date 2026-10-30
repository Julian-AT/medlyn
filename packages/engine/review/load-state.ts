import type { ReviewEntry } from "../contracts.ts";

export const REVIEW_LOAD_ERROR = "Saved reviews could not be loaded.";

export type ReviewLoadState = {
  scope: string | null;
  requestId: number | null;
  entries: ReviewEntry[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

export const emptyReviewLoad: ReviewLoadState = {
  scope: null,
  requestId: null,
  entries: [],
  status: "idle",
  error: null,
};

type ReviewLoadAction =
  | { type: "start"; scope: string | null; requestId: number }
  | { type: "loaded"; scope: string; requestId: number; entries: ReviewEntry[] }
  | { type: "failed"; scope: string; requestId: number }
  | { type: "saved"; scope: string; entry: ReviewEntry }
  | { type: "reset"; scope: string };

export function reduceReviewLoad(
  state: ReviewLoadState,
  action: ReviewLoadAction,
): ReviewLoadState {
  if (action.type === "start") {
    return {
      scope: action.scope,
      requestId: action.requestId,
      entries: state.scope === action.scope ? state.entries : [],
      status: action.scope ? "loading" : "idle",
      error: null,
    };
  }
  if (action.scope !== state.scope) return state;
  if (action.type === "saved" || action.type === "reset") {
    return {
      ...state,
      requestId: null,
      entries: action.type === "saved" ? [...state.entries, action.entry] : [],
      status: "ready",
      error: null,
    };
  }
  if (action.requestId !== state.requestId) return state;
  return action.type === "loaded"
    ? { ...state, entries: action.entries, status: "ready", error: null }
    : { ...state, status: "error", error: REVIEW_LOAD_ERROR };
}

/** Hide the previous patient's ledger immediately, before effects run for the new scope. */
export function visibleReviewLoad(state: ReviewLoadState, scope: string | null): ReviewLoadState {
  return scope && scope === state.scope ? state : emptyReviewLoad;
}
