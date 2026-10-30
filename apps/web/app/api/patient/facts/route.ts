import { loadFacts } from "@medlyn/engine/store";
import { patientError, patientHeaders, patientRequest } from "../request.ts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { patientId, window, kinds } = await patientRequest(request);
    return Response.json(
      { window, facts: await loadFacts(window, kinds, patientId) },
      { headers: patientHeaders },
    );
  } catch (error) {
    return patientError(error);
  }
}
