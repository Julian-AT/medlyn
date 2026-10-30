import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";
import { validateClaim } from "../claims/validate.ts";
import {
  type Claim,
  type EvidenceWindow,
  type Fact,
  ReviewEntry,
  ReviewRequest,
  type Segment,
} from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { reviews } from "../db/schema.ts";
import { refreshSessionLetters } from "../letter/storage.ts";
import { required } from "../required.ts";
import { evidenceWindow, loadFacts, loadSegments, PATIENT_ID } from "../store.ts";
import { activeReviews, assertReviewAction, RESET_TARGET } from "./overlay.ts";
export async function appendReview(input: ReviewRequest): Promise<ReviewEntry> {
  const req = ReviewRequest.parse(input);
  assertReviewAction(req);
  let supportResult: ReviewEntry["supportResult"] = null;
  if (req.targetType === "fact") {
    const window = await evidenceWindow();
    const facts = await loadFacts(window);
    const fact = facts.find((item) => item.id === req.targetId);
    if (!fact || fact.contentHash !== req.targetHash)
      throw new Error("The fact has changed; review its latest source");
    if (req.action === "correct") {
      supportResult = await checkCorrection(
        required(req.proposedText),
        fact,
        window,
        await loadSegments(window),
      );
    }
  }
  const [row] = await getDb()
    .insert(reviews)
    .values({ ...req, id: randomUUID(), patientId: PATIENT_ID, supportResult })
    .returning();
  const entry = fromRow(row);
  await refreshSessionLetters(req.sessionId, await listReviews(req.sessionId));
  return entry;
}
function fromRow(row: typeof reviews.$inferSelect): ReviewEntry {
  return ReviewEntry.parse({
    ...row,
    reason: row.reason ?? undefined,
    reasonText: row.reasonText ?? undefined,
    proposedText: row.proposedText ?? undefined,
    createdAt: row.createdAt.toISOString(),
  });
}
/** Full append-only history, including reset markers. Use activeReviews for the overlay. */
export async function listReviews(sessionId: string): Promise<ReviewEntry[]> {
  const rows = await getDb()
    .select()
    .from(reviews)
    .where(and(eq(reviews.patientId, PATIENT_ID), eq(reviews.sessionId, sessionId)))
    .orderBy(asc(reviews.createdAt), asc(reviews.id));
  return rows.map(fromRow);
}
export async function resetReviews(sessionId: string): Promise<void> {
  if (!sessionId.trim()) throw new Error("A session is required");
  await getDb().insert(reviews).values({
    id: randomUUID(),
    patientId: PATIENT_ID,
    sessionId,
    targetType: "card",
    targetId: RESET_TARGET,
    targetHash: "",
    action: "accept",
    author: "session",
    supportResult: null,
  });
  await refreshSessionLetters(sessionId, await listReviews(sessionId));
}
export async function sessionReviews(sessionId: string): Promise<ReviewEntry[]> {
  return activeReviews(await listReviews(sessionId));
}
type CorrectionValidator = (
  claim: Claim,
  context: {
    patientId: string;
    window: EvidenceWindow;
    facts: Fact[];
    segments: Segment[];
  },
) => Promise<Claim>;
/** The ledger links the fact; support is checked against its authoritative original passage. */
export async function checkCorrection(
  text: string,
  fact: Fact,
  window: EvidenceWindow,
  segments: Segment[],
  validate: CorrectionValidator = validateClaim,
): Promise<"supported" | "unsupported"> {
  const claim: Claim = {
    id: randomUUID(),
    kind: "composed",
    text,
    factIds: [],
    segmentIds: [fact.segmentId],
    author: "clinician",
    validation: { key: "", support: "unsupported" },
  };
  const checked = await validate(claim, { patientId: PATIENT_ID, window, facts: [fact], segments });
  return checked.validation.support === "supported" ? "supported" : "unsupported";
}
