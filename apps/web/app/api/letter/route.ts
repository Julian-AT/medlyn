import { BuildLetterRequest, buildLetter } from "@medlyn/engine/letter/build";
import { LetterWindowConflict } from "@medlyn/engine/letter/window";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = BuildLetterRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid letter request", issues: parsed.error.issues }, { status: 400 });
  try {
    return Response.json(await buildLetter(parsed.data), { status: 201 });
  } catch (error) {
    if (error instanceof LetterWindowConflict) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
