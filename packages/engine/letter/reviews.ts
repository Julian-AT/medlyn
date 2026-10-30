import type { Fact, Letter, LetterClaim, ReviewEntry } from "../contracts.ts";
import { activeReviews, reviewAnnotations } from "../review/overlay.ts";

/** Flags preserve the validated original until a clinician explicitly edits it. */
export function flagLetterClaim(
  claim: LetterClaim,
  entries: ReviewEntry[],
  facts?: Fact[],
): LetterClaim {
  const { flag: previous, ...original } = claim;
  let flag = previous?.reason === "edit_unsupported" ? previous : undefined;
  const active = activeReviews(entries);
  for (const entry of active) {
    if (entry.targetType === "fact" && claim.factIds.includes(entry.targetId)) {
      const fact = facts?.find((item) => item.id === entry.targetId);
      if (facts && (!fact || fact.contentHash !== entry.targetHash)) {
        flag = {
          reason: "source_changed",
          reviewId: entry.id,
          proposedText: "Recheck this sentence against the latest source.",
        };
      } else if (entry.action === "correct" && entry.supportResult === "supported") {
        flag = { reason: "fact_corrected", reviewId: entry.id, proposedText: entry.proposedText };
      }
    }
    if (
      entry.targetType === "finding" &&
      entry.action === "dismiss" &&
      active.findLast(
        (review) => review.targetType === "finding" && review.targetId === entry.targetId,
      )?.id === entry.id &&
      (claim.id === `letter-finding-${entry.targetId}` ||
        claim.id.startsWith(`letter-finding-${entry.targetId}-`))
    ) {
      flag = {
        reason: "finding_dismissed",
        reviewId: entry.id,
        proposedText: `Review whether to remove this clarification request: ${entry.reasonText ?? entry.reason ?? "dismissed"}.`,
      };
    }
  }
  if (facts && claim.factIds.some((id) => !facts.some((fact) => fact.id === id))) {
    flag = {
      reason: "source_changed",
      reviewId: flag?.reviewId ?? "source-change",
      proposedText: "Recheck this sentence against the latest source.",
    };
  }
  return flag ? { ...original, flag } : original;
}

export function applyLetterReviews(letter: Letter, entries: ReviewEntry[], facts?: Fact[]): Letter {
  const reviewIds = new Set(entries.map((entry) => entry.id));
  const annotations = [
    ...letter.annotations.filter((annotation) => !reviewIds.has(annotation.id)),
    ...reviewAnnotations(entries),
  ];
  return {
    ...letter,
    annotations,
    sections: letter.sections.map((section) => ({
      ...section,
      claims: section.claims.map((claim) => flagLetterClaim(claim, entries, facts)),
    })),
  };
}

export function flagChangedSources(
  letter: Letter,
  identity: (claim: LetterClaim) => string,
): Letter {
  return {
    ...letter,
    sections: letter.sections.map((section) => ({
      ...section,
      claims: section.claims.map((claim) => {
        if (
          ["boilerplate", "annotation"].includes(claim.kind) ||
          claim.validation.key === identity(claim)
        )
          return claim;
        return {
          ...claim,
          flag: {
            reason: "source_changed" as const,
            reviewId: "source-change",
            proposedText: "Recheck this sentence against the latest source.",
          },
        };
      }),
    })),
  };
}
