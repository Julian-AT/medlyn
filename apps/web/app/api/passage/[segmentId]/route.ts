import { PassageView } from "@medlyn/engine/contracts";
import { readPassage } from "@/lib/evidence-server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ segmentId: string }> },
) {
  const { segmentId } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(segmentId))
    return Response.json(
      { error: "Invalid source identifier." },
      { status: 400 },
    );
  try {
    const passage = await readPassage(segmentId);
    if (!passage)
      return Response.json(
        { error: "This passage is not available in the loaded documents." },
        { status: 404 },
      );
    return Response.json(PassageView.parse(passage), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "Passage unavailable",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        error:
          "The source documents could not be loaded. Retry when the evidence service is available.",
      },
      { status: 503 },
    );
  }
}
