import { loadLetter } from "@medlyn/engine/letter/storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
