import { loadLetter } from "@medlyn/engine/letter/storage";
import { DEFAULT_PATIENT_ID, patientIdFromRequest } from "../../../../../lib/active-patient.ts";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (patientIdFromRequest(request) !== DEFAULT_PATIENT_ID)
    return Response.json(
      { error: "This action is unavailable for synthetic patients." },
      { status: 409 },
    );
  const { id } = await params;
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId?.trim())
    return Response.json({ error: "A session is required." }, { status: 400 });
  try {
    return Response.json(await loadLetter(id, sessionId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "Letter refresh unavailable",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      { error: "The saved letter could not be refreshed. Retry." },
      { status: 503 },
    );
  }
}
