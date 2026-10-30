import type { ClaimLine } from "@medlyn/engine/contracts";

export function claimTextParts(claim: Pick<ClaimLine, "kind" | "text" | "factIds">) {
  const separator = claim.text.lastIndexOf(" · ");
  if (claim.kind !== "template" || claim.factIds.length !== 1 || separator <= 0) {
    return { primary: claim.text, source: null };
  }
  const source = claim.text.slice(separator + 3);
  if (!source.trim()) return { primary: claim.text, source: null };
  return { primary: claim.text.slice(0, separator), source };
}
