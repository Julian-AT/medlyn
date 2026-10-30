import { loadFindings } from "@medlyn/engine/store";
import { patientError, patientHeaders, patientRequest } from "../request.ts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { patientId, window } = await patientRequest(request);
    return Response.json(
      { window, findings: await loadFindings(window, patientId) },
      { headers: patientHeaders },
    );
  } catch (error) {
    return patientError(error);
  }
}
