import { createHash } from "node:crypto";
import type { AbsenceResult, Card, Claim, ClaimLine, EvidenceWindow, Fact, Finding, Need, Segment } from "../contracts.ts";
import { validateClaim, validateClaims, isShowable } from "../claims/validate.ts";
import { PATIENT_ID } from "../store.ts";
import { formatDate } from "../dates.ts";
import { absenceClaim, renderLine, trendLines } from "./templates.ts";
import { withModelSlot, type NeedSelection } from "./select.ts";

export type RenderContext = {
  window: EvidenceWindow;
  facts: Fact[];
  segments: Segment[];
  findings: Finding[];
};
export type RenderedCard = { card: Card; headline: Promise<Claim | undefined> };

export function cardFindings(facts: Fact[], segmentIds: string[], findings: Finding[]): Finding[] {
  const ids = new Set(facts.map((fact) => fact.id));
  const segments = new Set([...facts.map((fact) => fact.segmentId), ...segmentIds]);
  return findings.filter((finding) => finding.passages.some((passage) =>
    (passage.factId !== null && ids.has(passage.factId)) || segments.has(passage.segmentId),
  ));
}

export async function renderCard(
  need: Need,
  selection: NeedSelection,
  ctx: RenderContext,
  absence?: AbsenceResult,
  failed = false,
): Promise<RenderedCard> {
  const claimCtx = { patientId: PATIENT_ID, window: ctx.window };
  const validationCtx = { ...ctx, ...claimCtx, absenceResult: absence, absenceResults: absence ? [absence] : [] };
  const selected = new Set(selection.factIds);
  const facts = ctx.facts.filter((fact) => selected.has(fact.id));
  const rawLines = need.cardType === "trend"
    ? trendLines(facts, claimCtx)
    : facts.map((fact) => renderLine(fact, claimCtx));
  const validated = await validateClaims(rawLines, validationCtx);
  const lines: ClaimLine[] = rawLines.flatMap((line, index) => {
    const claim = validated[index];
    return claim && isShowable(claim) ? [{ ...line, ...claim }] : [];
  });
  let availability: Card["availability"] = facts.length ? "documented" : (absence?.status ?? "unavailable");
  if (!facts.length && absence?.status === "documented") {
    availability = "unavailable";
    console.warn("lens_documented_without_facts", { needId: need.id, segmentIds: absence.segmentIds });
  }
  if (failed || (facts.length > 0 && !lines.length)) availability = "unavailable";
  if (availability === "not_documented" && absence) {
    const draft = absenceClaim(need, absence.searched, claimCtx);
    if ("afterDocumentDate" in need) {
      draft.text = `${need.title}: no record of completion in the ${absence.searched.eligible} eligible documents as of ${formatDate(ctx.window.asOf)}.`;
    }
    const claim = await validateClaim(draft, validationCtx);
    if (isShowable(claim)) lines.push({ ...claim, assertion: "present", temporalStatus: "stated", asOf: ctx.window.asOf });
    else availability = "unavailable";
  }
  const related = cardFindings(facts, absence?.segmentIds ?? [], ctx.findings);
  const conflict: Card["conflict"] = related.some((finding) => finding.type === "contradiction")
    ? "contradicted"
    : related.length ? "needs_clarification" : "none";
  const card: Card = {
    id: `card-${need.id}`,
    needId: need.id,
    title: need.title,
    why: need.why,
    cardType: availability === "not_documented" ? "gap" : need.cardType,
    critical: need.critical,
    availability,
    completeness: facts.length && lines.length === rawLines.length ? selection.completeness : "partial",
    ...(selection.missing.length ? { missing: selection.missing } : {}),
    conflict,
    findingIds: related.map((finding) => finding.id),
    lines,
    ...(absence ? { searched: absence.searched } : {}),
  };
  const headline = availability === "documented" && selection.headline && lines.length
    ? withModelSlot(() => validateHeadline(selection, validationCtx)).catch(() => undefined)
    : Promise.resolve(undefined);
  return { card, headline };
}

async function validateHeadline(
  selection: NeedSelection,
  ctx: Parameters<typeof validateClaim>[1],
): Promise<Claim | undefined> {
  const headline = selection.headline;
  if (!headline) return undefined;
  const facts = ctx.facts.filter((fact) => headline.factIds.includes(fact.id));
  const claim: Claim = {
    id: `headline-${createHash("sha256").update(JSON.stringify([selection.needId, headline])).digest("hex").slice(0, 16)}`,
    kind: "composed",
    text: headline.text,
    factIds: headline.factIds,
    segmentIds: [...new Set(facts.map((fact) => fact.segmentId))],
    author: "machine",
    validation: { key: "", support: "unsupported" },
  };
  const checked = await validateClaim(claim, ctx);
  return isShowable(checked) ? checked : undefined;
}
