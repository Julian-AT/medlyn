import { describe, expect, it } from "vitest";
import type { LetterClaim, ReviewEntry } from "../contracts.ts";
import { flagLetterClaim } from "./reviews.ts";

const claim: LetterClaim = {
  id: "letter-finding-example",
  kind: "composed",
  text: "Synthetic clarification request",
  factIds: [],
  segmentIds: ["example-segment"],
  author: "machine",
  validation: { key: "example-validation", support: "supported" },
};
const dismiss: ReviewEntry = {
  id: "dismiss",
  sessionId: "example-session",
  targetType: "finding",
  targetId: "example",
  targetHash: "example-hash",
  action: "dismiss",
  reason: "different_context",
  author: "Example reviewer",
  supportResult: null,
  createdAt: "2020-01-01T12:00:00Z",
};

describe("reopened letter clarification", () => {
  it("removes the dismissed warning when the finding is left open again", () => {
    const flagged = flagLetterClaim(claim, [dismiss]);
    expect(flagged.flag?.reason).toBe("finding_dismissed");
    const reopened = flagLetterClaim(flagged, [
      dismiss,
      { ...dismiss, id: "reopen", action: "leave_open" },
    ]);
    expect(reopened.flag).toBeUndefined();
    expect(reopened.text).toBe(claim.text);
    expect(reopened.validation).toEqual(claim.validation);
  });
  it("uses the latest finding review without hiding unsupported edit warnings", () => {
    const edited = { ...claim, flag: { reason: "edit_unsupported" as const, reviewId: "note" } };
    const reviews = [dismiss, { ...dismiss, id: "accept", action: "accept" as const }];
    expect(flagLetterClaim(edited, reviews).flag?.reason).toBe("edit_unsupported");
    expect(
      flagLetterClaim(claim, [...reviews, { ...dismiss, id: "dismiss-again" }]).flag?.reviewId,
    ).toBe("dismiss-again");
  });
});
