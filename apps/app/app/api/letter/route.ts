import { BuildLetterRequest, buildLetter } from "@medlyn/engine/letter/build";
import { LetterWindowConflict } from "@medlyn/engine/letter/window";
import { llmErrorDetails } from "@medlyn/engine/llm/client";
import { DEFAULT_PATIENT_ID, patientIdFromRequest } from "../../../lib/active-patient.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (patientIdFromRequest(request) !== DEFAULT_PATIENT_ID)
    return Response.json(
      { error: "This action is unavailable for synthetic patients." },
      { status: 409 },
    );
  const body: unknown = await request.json().catch(() => null);
  const parsed = BuildLetterRequest.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "Invalid letter request", issues: parsed.error.issues },
      { status: 400 },
    );
  try {
    return Response.json(await buildLetter(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof LetterWindowConflict) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.warn("letter_unavailable", llmErrorDetails(error));
    return Response.json({ error: "Couldn't draft the letter. Try again." }, { status: 503 });
  }
}
