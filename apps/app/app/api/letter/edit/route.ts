import { LetterEditRequest } from "@medlyn/engine/contracts";
import { editLetterClaim } from "@medlyn/engine/letter/edit";
import { DEFAULT_PATIENT_ID, patientIdFromRequest } from "../../../../lib/active-patient.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (patientIdFromRequest(request) !== DEFAULT_PATIENT_ID)
    return Response.json(
      { error: "This action is unavailable for synthetic patients." },
      { status: 409 },
    );
  const body: unknown = await request.json().catch(() => null);
  const parsed = LetterEditRequest.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Invalid letter edit", issues: parsed.error.issues },
      { status: 400 },
    );
  try {
    return Response.json(await editLetterClaim(parsed.data));
  } catch (error) {
    if (
      error instanceof Error &&
      /Letter not found|factual letter|edit requires/.test(error.message)
    )
      return Response.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
