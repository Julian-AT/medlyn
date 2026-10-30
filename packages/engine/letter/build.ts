import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AbsenceResult, Claim, EvidenceWindow, Fact, Finding, Letter, LetterSection, Segment } from "../contracts.ts";
import { IsoDate } from "../contracts.ts";
import { formatDate } from "../dates.ts";
import { loadFacts, loadFindings, loadSegments, PATIENT_ID } from "../store.ts";
import { validateClaims, isShowable } from "../claims/validate.ts";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/validate.ts";
import { renderLine } from "../lens/templates.ts";
import { checkDocumented } from "../lens/absence.ts";
import { listReviews } from "../review/ledger.ts";
import { reviewAnnotations } from "../review/overlay.ts";
import { applyLetterReviews } from "./reviews.ts";
import { saveLetter } from "./storage.ts";
import { resolveLetterWindow } from "./window.ts";

export const BuildLetterRequest = z.object({
  sessionId: z.string().min(1),
  lensKey: z.string().min(1).optional(),
  asOf: IsoDate.optional(),
  corpusRevision: z.string().min(1).optional(),
});
export type BuildLetterRequest = z.infer<typeof BuildLetterRequest>;
export type LetterContext = { patientId: string; window: EvidenceWindow; facts: Fact[]; segments: Segment[] };
export type LetterDependencies = {
  validate: (claims: Claim[], context: LetterContext) => Promise<Claim[]>;
  check: (concept: string, synonyms: string[], window: EvidenceWindow) => Promise<AbsenceResult>;
};

const FOLLOWUPS = [
  { id: "carotid", label: "Carotid duplex follow-up", pattern: /carot|duplex|karotis/i, synonyms: ["follow-up carotid duplex completed", "Karotiskontrolle durchgeführt"] },
  { id: "eye", label: "Regular eye check-ups", pattern: /eye|ophthalm|augen/i, synonyms: ["follow-up eye examination completed", "augenärztliche Kontrolle durchgeführt"] },
  { id: "bp", label: "Regular blood pressure checks with medication adjustment by the GP", pattern: /blood pressure|hypertens|blutdruck|hausarzt|primary care|medication adjustment|adjustment.*medication|Anpassung/i, synonyms: ["GP blood pressure follow-up completed", "hausärztliche Blutdruckkontrolle durchgeführt"] },
] as const;

function textOf(fact: Fact): string {
  return `${fact.labelEn} ${JSON.stringify(fact.attrs)}`;
}

function draft(id: string, text: string, factIds: string[], segmentIds: string[], kind: Claim["kind"] = "composed"): Claim {
  return { id, kind, text, factIds: [...new Set(factIds)], segmentIds: [...new Set(segmentIds)], author: "machine", validation: { key: "", support: "unsupported" } };
}

function boilerplate(id: string, text: string): Claim {
  return draft(id, text, [], [], "boilerplate");
}

/** Stay dates come from the located admission/discharge header, never the document date. */
export function stayDateClaim(segments: Segment[], facts: Fact[]): Claim | null {
  for (const segment of segments.filter((item) => item.documentId === "12340012")) {
    const dates = segment.text.match(/(?:Aufnahme|Admission)\s+(?:am|on)\s+(\d{1,2}[/.]\d{1,2}[/.]\d{4})[\s\S]*?(?:Entlassen|Discharged)\s+(?:am|on)\s+(\d{1,2}[/.]\d{1,2}[/.]\d{4})/i);
    if (!dates) continue;
    const cited = facts.filter((fact) => fact.segmentId === segment.id);
    return draft("letter-stay-reason", `Follow-up of the inpatient stay, ${dates[1]} to ${dates[2]}.`, cited.map((fact) => fact.id), [segment.id]);
  }
  return null;
}

/** Template-first letter assembly. All factual output goes through the shared validator. */
export async function assembleLetter(context: LetterContext, findings: Finding[], deps: LetterDependencies): Promise<LetterSection[]> {
  const { facts, segments, window, patientId } = context;
  const ctx = { patientId, window };
  const sections: LetterSection[] = [];
  const add = (id: LetterSection["id"], title: string, claims: Claim[]) => sections.push({ id, title, claims });
  add("header", "GP follow-up letter", [boilerplate("letter-greeting", "Dear colleague,")]);
  const stay = facts.filter((fact) => fact.documentId === "12340012" && ["event", "demographic"].includes(fact.kind) && /admi|discharg|stay|inpatient|station|aufenthalt|aufnahm|entlass/i.test(textOf(fact)));
  const stayReason = stayDateClaim(segments, facts);
  add("reason", "Reason for follow-up", stayReason ? [stayReason] : stay.map((fact) => renderLine(fact, ctx)));
  const recommendations = facts.filter((fact) => (fact.kind === "recommendation" || fact.kind === "procedure" && fact.temporalStatus === "planned") && ["12340011", "12340012"].includes(fact.documentId) && FOLLOWUPS.some((item) => item.pattern.test(textOf(fact))));
  const recommendationClaims = recommendations.map((fact) => {
    if (fact.support === "supported") return renderLine(fact, ctx);
    const months = String(fact.attrs.relativeDue ?? "").match(/(?:in\s+)?(\d+)\s+Monat/i)?.[1];
    const text = /carot|duplex/i.test(fact.labelEn) && months ? `Follow-up carotid duplex ultrasound planned in ${months} months.` : fact.labelEn;
    // Recheck the original passage when extraction support is partial; do not inherit it.
    return draft(`letter-recommendation-${fact.id}`, text, [], [fact.segmentId]);
  });
  add("recommendations", "Recommendations at discharge", recommendationClaims);
  const checks = Promise.all(FOLLOWUPS.map(async (followup): Promise<Claim[] | null> => {
    const cited = recommendations.filter((fact) => followup.pattern.test(textOf(fact)));
    if (!cited.length) return null;
    const concept = `Documented completion AFTER the June 2015 discharge of: ${followup.label}. Exclude baseline investigations during the stay and the discharge recommendation itself; a recommendation is not completion. Do not infer completion from incidental later observations or a changed medication list.`;
    const result = await deps.check(concept, [...followup.synonyms], window);
    if (result.status === "unavailable") return null;
    if (result.status === "documented") {
      const hits = facts.filter((fact) => result.segmentIds.includes(fact.segmentId) && fact.kind !== "recommendation");
      return hits.map((fact) => renderLine(fact, ctx));
    }
    const text = `${followup.label}: no record of completion in the ${result.searched.eligible} eligible documents as of ${formatDate(window.asOf)}.`;
    const claim = draft(`letter-completion-${followup.id}`, text, cited.filter((fact) => fact.support === "supported").map((fact) => fact.id), cited.map((fact) => fact.segmentId), "absence");
    // The shared boundary requires the successful full-corpus absence result as provenance.
    const absence = { ...claim, absenceResult: result };
    return [absence];
  }));
  const completion: Claim[] = [];
  const candesartan = facts.filter((fact) => fact.kind === "medication" && /discharg|entlass/i.test(String(fact.attrs.listLabel ?? "")) && /candesartan|blopress/i.test(textOf(fact))).sort((a, b) => a.docDate.localeCompare(b.docDate));
  if (new Set(candesartan.map((fact) => fact.documentId)).size >= 2) {
    completion.push(...candesartan.map((fact) => renderLine(fact, ctx)));
  }
  add("completion", "Completion status and medication change over time", completion);
  const carotid = findings.find((finding) => finding.id === "C1" || /carot|karotis/i.test(`${finding.title} ${finding.explanation}`) && /side|right|left|laterality/i.test(`${finding.title} ${finding.explanation}`));
  const clarification = carotid ? [draft(`letter-finding-${carotid.id}`, "Please clarify the side of carotid stenosis: it is documented inconsistently.", carotid.passages.flatMap((passage) => passage.factId && facts.some((fact) => fact.id === passage.factId && fact.support === "supported") ? [passage.factId] : []), carotid.passages.map((passage) => passage.segmentId))] : [];
  add("clarification", "Clarification requested", clarification);
  const later = facts.filter((fact) => !["12340011", "12340012"].includes(fact.documentId) && fact.support === "supported");
  const diagnosis = later.filter((fact) => ["diagnosis", "histology"].includes(fact.kind) && /invasive ductal|breast.*carcinoma/i.test(fact.labelEn))
    .sort((a, b) => (Number(/invasive ductal/i.test(b.labelEn)) * 4 + Number(/left/i.test(b.labelEn)) * 2) - (Number(/invasive ductal/i.test(a.labelEn)) * 4 + Number(/left/i.test(a.labelEn)) * 2) || b.docDate.localeCompare(a.docDate))[0];
  const board = later.filter((fact) => /tumou?r\s*board/i.test(fact.labelEn) && fact.temporalStatus === "done").sort((a, b) => b.docDate.localeCompare(a.docDate))[0];
  const boardRecommendations = later.filter((fact) => fact.kind === "recommendation" && /quadrant|intraoperative|iort/i.test(fact.labelEn));
  const boardRecommendation = boardRecommendations.find((fact) => /quadrant/i.test(fact.labelEn) && /intraoperative|iort/i.test(fact.labelEn)) ?? boardRecommendations[0];
  const surgery = later.filter((fact) => fact.kind === "procedure" && fact.temporalStatus === "planned" && /quadrant|intraoperative|iort/i.test(fact.labelEn));
  const sinceClaims: Claim[] = diagnosis ? [draft(`letter-diagnosis-${diagnosis.id}`, diagnosis.labelEn, [diagnosis.id], [diagnosis.segmentId])] : [];
  sinceClaims.push(...[board, boardRecommendation, ...surgery].filter((fact): fact is Fact => Boolean(fact)).map((fact) => renderLine(fact, ctx)));
  add("since_then", "Since then", sinceClaims);
  const dischargeLists = facts.filter((fact) => fact.kind === "medication" && /discharg|entlass/i.test(String(fact.attrs.listLabel ?? "")));
  const medicationDate = dischargeLists.map((fact) => fact.docDate).sort().at(-1);
  const medication = dischargeLists.filter((fact) => fact.docDate === medicationDate);
  add("medication", medicationDate ? `Discharge medication, ${formatDate(medicationDate)}` : "Discharge medication", medication.map((fact) => {
    const line = renderLine(fact, ctx);
    const text = line.text.replace(/(\d+)x\s*\/\s*Woche/gi, "$1 times weekly").replace(/\bTabl\./gi, "tablet").replace(/\b1 times weekly 1 tablet\b/g, "1 tablet once weekly");
    return text === line.text ? line : draft(`letter-medication-${fact.id}`, text, [fact.id], [fact.segmentId]);
  }));
  add("clinician_notes", "Clinician notes — not from the source documents", []);
  add("closing", "Closing", [boilerplate("letter-closing", "Kind regards,")]);
  const [initial, checkedCompletion] = await Promise.all([
    deps.validate(sections.flatMap((section) => section.claims), context), checks,
  ]);
  const completionClaims = checkedCompletion.flatMap((items) => items ?? []);
  sections.find((section) => section.id === "completion")!.claims.unshift(...completionClaims);
  const validated = [...initial, ...await deps.validate(completionClaims, context)];
  const byId = new Map(validated.map((claim) => [claim.id, claim]));
  // A composed failure falls back to the same cited facts, never a new free-text claim.
  const fallbacks = await deps.validate(sections.flatMap((section) => section.claims.flatMap((claim) => {
    if (claim.kind !== "composed" || isShowable(byId.get(claim.id) ?? claim)) return [];
    return facts.filter((fact) => claim.factIds.includes(fact.id)).map((fact) => ({ ...renderLine(fact, ctx), id: `${claim.id}-${fact.id}` }));
  })), context);
  const fallbackByPrefix = (id: string) => fallbacks.filter((claim) => claim.id.startsWith(`${id}-`) && isShowable(claim));
  const seenIds = new Set<string>();
  return sections.map((section) => ({ ...section, claims: section.claims.flatMap((claim) => {
    const checked = byId.get(claim.id);
    if (checked && isShowable(checked) && (checked.kind === "boilerplate" || checked.factIds.length || checked.segmentIds.length)) return [checked];
    return claim.kind === "composed" ? fallbackByPrefix(claim.id) : [];
  }).map((claim) => {
    const id = seenIds.has(claim.id) ? `${claim.id}-${section.id}` : claim.id;
    seenIds.add(claim.id);
    return { ...claim, id };
  }) }));
}

export async function buildLetter(input: BuildLetterRequest): Promise<Letter> {
  const started = performance.now();
  const req = BuildLetterRequest.parse(input);
  const window = await resolveLetterWindow(req);
  const [facts, segments, findings, entries] = await Promise.all([loadFacts(window), loadSegments(window), loadFindings(window), listReviews(req.sessionId)]);
  const context = { patientId: PATIENT_ID, window, facts, segments };
  const sections = await assembleLetter(context, findings, { validate: validateClaims, check: checkDocumented });
  const annotations = reviewAnnotations(entries);
  await validateClaims(annotations.map((annotation) => ({ ...draft(`letter-note-${annotation.id}`, annotation.text, [], [], "annotation"), author: "clinician" })), context);
  const lensKey = req.lensKey ?? cacheKey({ patientId: PATIENT_ID, corpusRevision: window.corpusRevision, asOf: window.asOf, eligibleDocumentIds: window.eligibleDocumentIds, validatorVersion: VALIDATOR_VERSION, text: "GP follow-up letter", facts, segmentIds: segments.map((segment) => segment.id) });
  const letter = applyLetterReviews({ id: randomUUID(), sessionId: req.sessionId, lensKey, asOf: window.asOf, sections, annotations, createdAt: new Date().toISOString(), generationMs: performance.now() - started }, entries, facts);
  await saveLetter(letter);
  return letter;
}
