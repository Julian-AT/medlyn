import { randomUUID } from "node:crypto";
import { z } from "zod";
import { LetterEditRequest, type Claim, type Letter } from "../contracts.ts";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/version.ts";
import { validateClaim, isShowable } from "../claims/validate.ts";
import { evidenceWindow, loadFacts, loadSegments, PATIENT_ID } from "../store.ts";
import { listReviews } from "../review/ledger.ts";
import { applyLetterReviews, flagChangedSources } from "./reviews.ts";
import type { LetterContext } from "./build.ts";
import { loadLetter, saveLetter } from "./storage.ts";

type EditRequest = z.infer<typeof LetterEditRequest>;
type Validator = (claim: Claim, context: LetterContext) => Promise<Claim>;

export async function applyLetterEdit(letter: Letter, input: EditRequest, context: LetterContext, validate: Validator): Promise<Letter> {
  const req = LetterEditRequest.parse(input);
  if (letter.id !== req.letterId || letter.sessionId !== req.sessionId) throw new Error("Letter not found in this session");
  if (!req.text.trim() || !req.author.trim()) throw new Error("An edit requires text and an author");
  const original = letter.sections.flatMap((section) => section.claims).find((claim) => claim.id === req.claimId);
  if (!original || ["boilerplate", "annotation"].includes(original.kind)) throw new Error("A factual letter sentence is required");
  const { flag, ...source } = original;
  const edited = await validate({ ...source, text: req.text, kind: "composed", author: "clinician", validation: { key: "", support: "unsupported" } }, context);
  if (isShowable(edited)) {
    return { ...letter, sections: letter.sections.map((section) => ({ ...section, claims: section.claims.map((claim) => claim.id === original.id ? edited : claim) })) };
  }
  const annotation = { id: randomUUID(), text: req.text, author: req.author, targetId: original.id, createdAt: new Date().toISOString() };
  await validate({ id: `letter-note-${annotation.id}`, kind: "annotation", text: annotation.text, factIds: [], segmentIds: [], author: "clinician", validation: { key: "", support: "unsupported" } }, context);
  return { ...letter, annotations: [...letter.annotations, annotation], sections: letter.sections.map((section) => ({ ...section, claims: section.claims.map((claim) => claim.id === original.id ? { ...claim, flag: { reason: "edit_unsupported", reviewId: annotation.id, proposedText: req.text } } : claim) })) };
}

export async function editLetterClaim(input: EditRequest): Promise<Letter> {
  const req = LetterEditRequest.parse(input);
  const letter = await loadLetter(req.letterId, req.sessionId);
  const window = await evidenceWindow(letter.asOf);
  const [facts, segments, reviews] = await Promise.all([loadFacts(window), loadSegments(window), listReviews(req.sessionId)]);
  const context = { patientId: PATIENT_ID, window, facts, segments };
  const reviewed = flagChangedSources(applyLetterReviews(letter, reviews, facts), (claim) => cacheKey({ patientId: PATIENT_ID, ...window, validatorVersion: VALIDATOR_VERSION, text: claim.text, facts: claim.factIds.map((id) => ({ id, contentHash: facts.find((fact) => fact.id === id)?.contentHash ?? "missing" })), segmentIds: claim.segmentIds }));
  const updated = await applyLetterEdit(reviewed, req, context, validateClaim);
  await saveLetter(updated);
  return updated;
}
