export function validReviewSession(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim();
}

export function reviewScope(sessionId: string, patientId: string | null): string | null {
  return validReviewSession(sessionId) && patientId && /^[a-zA-Z0-9_-]{1,100}$/.test(patientId)
    ? JSON.stringify([patientId, sessionId])
    : null;
}

export function sessionForPatient(
  session: { patientId: string; id: string } | null,
  patientId: string,
): string {
  return session?.patientId === patientId && validReviewSession(session.id) ? session.id : "";
}
