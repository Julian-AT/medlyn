import { FactKind } from "@medlyn/engine/contracts";
export class PatientRequestError extends Error {}
export function patientQuery(params: URLSearchParams, defaultPatientId: string) {
  const patientId = params.get("patientId") ?? defaultPatientId;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(patientId))
    throw new PatientRequestError("Invalid patient identifier");
  const asOf = params.get("asOf") ?? undefined;
  if (
    asOf !== undefined &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) ||
      !Number.isFinite(Date.parse(asOf)) ||
      new Date(asOf).toISOString().slice(0, 10) !== asOf)
  )
    throw new PatientRequestError("Invalid evidence date");
  const raw = params.get("kind");
  const parsed = raw ? FactKind.safeParse(raw) : null;
  if (parsed && !parsed.success) throw new PatientRequestError("Invalid fact kind");
  return { patientId, asOf, kinds: parsed?.success ? [parsed.data] : undefined };
}
