import { evidenceWindow, PATIENT_ID } from "@medlyn/engine/store";
import { PatientRequestError, patientQuery } from "./request-values.ts";
export async function patientRequest(request: Request) {
  const query = patientQuery(new URL(request.url).searchParams, PATIENT_ID);
  return {
    patientId: query.patientId,
    window: await evidenceWindow(query.asOf, query.patientId),
    kinds: query.kinds,
  };
}
export function patientError(error: unknown) {
  if (error instanceof PatientRequestError)
    return Response.json({ error: error.message }, { status: 400, headers: patientHeaders });
  console.error("Patient read unavailable", error instanceof Error ? error.message : String(error));
  return Response.json(
    { error: "The patient record could not be loaded." },
    { status: 503, headers: patientHeaders },
  );
}
export const patientHeaders = { "Cache-Control": "no-store" };
