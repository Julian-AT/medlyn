import { ReviewRequest } from "@medlyn/engine/contracts";
import { appendReview, listReviews, resetReviews } from "@medlyn/engine/review/ledger";
import { activeReviews } from "@medlyn/engine/review/overlay";
import { validReviewSession } from "@medlyn/engine/review/session";
import { DEFAULT_PATIENT_ID, patientIdFromRequest } from "../../../lib/active-patient.ts";
import { reviewPatientError, reviewResponse, reviewStorageError } from "./request.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const patientError = reviewPatientError(request);
  if (patientError) return patientError;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const parsed = ReviewRequest.pick({ sessionId: true }).safeParse({ sessionId });
  if (!parsed.success || !validReviewSession(parsed.data.sessionId))
    return reviewResponse({ error: "A sessionId is required" }, 400);
  if (patientIdFromRequest(request) !== DEFAULT_PATIENT_ID) return reviewResponse([]);
  try {
    return reviewResponse(activeReviews(await listReviews(parsed.data.sessionId)));
  } catch (error) {
    return reviewStorageError("list", error);
  }
}

export async function POST(request: Request) {
  const patientError = reviewPatientError(request);
  if (patientError) return patientError;
  if (patientIdFromRequest(request) !== DEFAULT_PATIENT_ID)
    return reviewResponse({ error: "This action is unavailable for synthetic patients." }, 409);
  const body: unknown = await request.json().catch(() => null);
  const parsed = ReviewRequest.safeParse(body);
  if (!parsed.success)
    return reviewResponse({ error: "Invalid review request", issues: parsed.error.issues }, 400);
  if (!validReviewSession(parsed.data.sessionId))
    return reviewResponse({ error: "A sessionId is required" }, 400);
  try {
    return reviewResponse(await appendReview(parsed.data), 201);
  } catch (error) {
    if (
      error instanceof Error &&
      /Invalid review|correction needs|dismissal needs|fact has changed/.test(error.message)
    )
      return reviewResponse({ error: error.message }, 409);
    return reviewStorageError("append", error);
  }
}

export async function DELETE(request: Request) {
  const patientError = reviewPatientError(request);
  if (patientError) return patientError;
  if (patientIdFromRequest(request) !== DEFAULT_PATIENT_ID)
    return reviewResponse({ error: "This action is unavailable for synthetic patients." }, 409);
  const querySession = new URL(request.url).searchParams.get("sessionId");
  const body: unknown =
    querySession !== null ? { sessionId: querySession } : await request.json().catch(() => null);
  const parsed = ReviewRequest.pick({ sessionId: true }).safeParse(body);
  if (!parsed.success || !validReviewSession(parsed.data.sessionId))
    return reviewResponse({ error: "A sessionId is required" }, 400);
  try {
    await resetReviews(parsed.data.sessionId);
    return reviewResponse({ entries: [] });
  } catch (error) {
    return reviewStorageError("reset", error);
  }
}
