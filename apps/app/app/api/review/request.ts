import { patientIdFromRequest, validPatientId } from "../../../lib/active-patient.ts";

export function reviewResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });
}

/** A stale tab must not read or write its old session under the newly selected cookie. */
export function reviewPatientError(request: Request): Response | null {
  const expected = new URL(request.url).searchParams.get("patientId");
  if (expected === null) return null;
  if (!validPatientId(expected)) return reviewResponse({ error: "Invalid patientId" }, 400);
  return expected === patientIdFromRequest(request)
    ? null
    : reviewResponse({ error: "The selected patient changed. Reload this page." }, 409);
}

export function reviewStorageError(operation: string, error: unknown): Response {
  console.warn("review_storage_unavailable", {
    operation,
    name: error instanceof Error ? error.name : "Unknown",
  });
  return reviewResponse(
    { error: "The review service is temporarily unavailable. Try again." },
    503,
  );
}
