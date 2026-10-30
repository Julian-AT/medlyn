import { loadDocuments } from "@medlyn/engine/store";
import { patientError, patientHeaders, patientRequest } from "../request.ts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { patientId, window } = await patientRequest(request);
    const documents = (await loadDocuments(window, patientId)).map(
      ({ normText, ...document }) => document,
    );
    return Response.json({ window, documents }, { headers: patientHeaders });
  } catch (error) {
    return patientError(error);
  }
}
