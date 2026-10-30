import { describe, expect, it } from "vitest";
import type { ReviewEntry } from "../contracts.ts";
import {
  emptyReviewLoad,
  REVIEW_LOAD_ERROR,
  reduceReviewLoad,
  visibleReviewLoad,
} from "../review/load-state.ts";

const entry: ReviewEntry = {
  id: "review-a",
  sessionId: "session-a",
  targetType: "card",
  targetId: "card-a",
  targetHash: "hash-a",
  action: "accept",
  author: "Clinician",
  supportResult: null,
  createdAt: "2026-10-30T05:00:00Z",
};
const start = (scope = "a", requestId = 1) =>
  reduceReviewLoad(emptyReviewLoad, { type: "start", scope, requestId });

describe("review hook state transitions", () => {
  it("stays idle until the session and patient are ready", () => {
    const state = reduceReviewLoad(emptyReviewLoad, { type: "start", scope: null, requestId: 1 });
    expect(state.status).toBe("idle");
    expect(state.error).toBeNull();
  });

  it("treats an empty ledger as a successful load", () => {
    const state = reduceReviewLoad(start(), {
      type: "loaded",
      scope: "a",
      requestId: 1,
      entries: [],
    });
    expect(state.status).toBe("ready");
    expect(state.entries).toEqual([]);
    expect(state.error).toBeNull();
  });

  it("only exposes persistent errors for the active load and clears them on retry", () => {
    const failed = reduceReviewLoad(start(), { type: "failed", scope: "a", requestId: 1 });
    expect(failed.error).toBe(REVIEW_LOAD_ERROR);
    const retry = reduceReviewLoad(failed, { type: "start", scope: "a", requestId: 2 });
    expect(retry.error).toBeNull();
    expect(retry.status).toBe("loading");
    expect(reduceReviewLoad(retry, { type: "failed", scope: "a", requestId: 1 })).toBe(retry);
  });

  it("hides old reviews and errors immediately during a patient switch", () => {
    const saved = reduceReviewLoad(start(), { type: "saved", scope: "a", entry });
    expect(visibleReviewLoad(saved, "a").entries).toEqual([entry]);
    expect(visibleReviewLoad(saved, "b")).toBe(emptyReviewLoad);
    expect(visibleReviewLoad(saved, null)).toBe(emptyReviewLoad);
    const failed = reduceReviewLoad(start(), { type: "failed", scope: "a", requestId: 1 });
    expect(visibleReviewLoad(failed, "b").error).toBeNull();
  });

  it("ignores obsolete success and failure after A → B → A", () => {
    const switched = reduceReviewLoad(start("b", 2), { type: "start", scope: "a", requestId: 3 });
    expect(
      reduceReviewLoad(switched, {
        type: "loaded",
        scope: "a",
        requestId: 1,
        entries: [entry],
      }),
    ).toBe(switched);
    expect(reduceReviewLoad(switched, { type: "failed", scope: "b", requestId: 2 })).toBe(switched);
  });

  it.each(["saved", "reset"] as const)("ignores a load racing with a successful %s", (type) => {
    const changed =
      type === "saved"
        ? reduceReviewLoad(start(), { type, scope: "a", entry })
        : reduceReviewLoad(start(), { type, scope: "a" });
    expect(
      reduceReviewLoad(changed, {
        type: "loaded",
        scope: "a",
        requestId: 1,
        entries: [entry],
      }),
    ).toBe(changed);
    expect(reduceReviewLoad(changed, { type: "failed", scope: "a", requestId: 1 })).toBe(changed);
    expect(changed.error).toBeNull();
    expect(changed.entries).toEqual(type === "saved" ? [entry] : []);
  });

  it("keeps saved reviews visible during a same-patient reload", () => {
    const saved = reduceReviewLoad(start(), { type: "saved", scope: "a", entry });
    expect(reduceReviewLoad(saved, { type: "start", scope: "a", requestId: 2 }).entries).toEqual([
      entry,
    ]);
    expect(reduceReviewLoad(saved, { type: "start", scope: "b", requestId: 2 }).entries).toEqual(
      [],
    );
    expect(reduceReviewLoad(saved, { type: "reset", scope: "b" })).toBe(saved);
  });
});
