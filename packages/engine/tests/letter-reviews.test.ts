import { describe, expect, it } from "vitest";
import type { Fact, Letter, LetterClaim, ReviewEntry } from "../contracts.ts";
import { applyLetterReviews, flagChangedSources, flagLetterClaim } from "../letter/reviews.ts";
import { RESET_TARGET } from "../review/overlay.ts";

const claim: LetterClaim = { id: "letter-finding-C1", kind: "composed", text: "Synthetic uncertainty", factIds: ["fact"], segmentIds: ["segment"], author: "machine", validation: { key: "validated-original", support: "supported" } };
const entry: ReviewEntry = { id: "review", sessionId: "s", targetType: "fact", targetId: "fact", targetHash: "hash", action: "correct", proposedText: "Proposed correction", author: "Clinician", supportResult: "supported", createdAt: "2026-10-30T05:00:00Z" };

describe("letter review flags", () => {
  it("flags a correction without silently rewriting the factual sentence", () => {
    const result = flagLetterClaim(claim, [entry]); expect(result.text).toBe(claim.text); expect(result.validation).toEqual(claim.validation); expect(result.flag).toEqual({ reason: "fact_corrected", reviewId: "review", proposedText: "Proposed correction" });
  });
  it("flags dismissed uncertainty without removing it", () => {
    const result = flagLetterClaim(claim, [{ ...entry, targetType: "finding", targetId: "C1", action: "dismiss", reason: "different_context" }]);
    expect(result.text).toBe(claim.text); expect(result.flag?.reason).toBe("finding_dismissed"); expect(result.flag?.proposedText).toContain("different_context");
  });
  it("acceptance is a badge only", () => {
    expect(flagLetterClaim(claim, [{ ...entry, action: "accept" }])).toEqual(claim);
  });
  it("unsupported correction stays an annotation without flagging source facts", () => {
    expect(flagLetterClaim(claim, [{ ...entry, supportResult: "unsupported" }])).toEqual(claim);
  });
  it("flags a source hash change", () => {
    expect(flagLetterClaim(claim, [entry], [{ id: "fact", contentHash: "changed" } as Fact]).flag?.reason).toBe("source_changed");
  });
  it("flags missing sources even without reviews", () => {
    expect(flagLetterClaim(claim, [], []).flag?.reason).toBe("source_changed");
  });
  it("reset clears review flags while preserving unsupported edit warnings", () => {
    const flagged = flagLetterClaim(claim, [entry]);
    expect(flagLetterClaim(flagged, [entry, { ...entry, id: "reset", targetId: RESET_TARGET }]).flag).toBeUndefined();
    expect(flagLetterClaim({ ...claim, flag: { reason: "edit_unsupported", reviewId: "note" } }, []).flag?.reason).toBe("edit_unsupported");
  });
});

it("flags a changed validation identity even when fact ids are unchanged", () => {
  const letter: Letter = { id: "l", sessionId: "s", lensKey: "lens", asOf: "2016-04-15", sections: [{ id: "clarification", title: "Clarification", claims: [claim] }], annotations: [], createdAt: "2026-10-30T05:00:00Z", generationMs: 1 };
  expect(flagChangedSources(letter, () => "validated-original")).toEqual(letter);
  const flagged = flagChangedSources(letter, () => "different-corpus-or-window");
  expect(flagged.sections[0].claims[0].flag?.reason).toBe("source_changed");
  expect(flagged.sections[0].claims[0].text).toBe(claim.text);
});

it("reset removes ledger annotations from stored letters and preserves separate clinician edits", () => {
  const unsupported = { ...entry, supportResult: "unsupported" as const };
  const letter: Letter = { id: "l", sessionId: "s", lensKey: "lens", asOf: "2016-04-15", sections: [], annotations: [{ id: "separate-edit", text: "Separate clinician note", author: "Clinician", createdAt: entry.createdAt }], createdAt: entry.createdAt, generationMs: 1 };
  const annotated = applyLetterReviews(letter, [unsupported]);
  expect(annotated.annotations.map((note) => note.id)).toEqual(["separate-edit", "review"]);
  const reset = applyLetterReviews(annotated, [unsupported, { ...entry, id: "reset", targetId: RESET_TARGET }]);
  expect(reset.annotations.map((note) => note.id)).toEqual(["separate-edit"]);
});
