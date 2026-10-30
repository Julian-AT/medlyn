import { IsoDate } from "@medlyn/engine/contracts";
import { evidenceWindow, loadFacts } from "@medlyn/engine/store";
import { patientIdFromRequest } from "../../../../../lib/active-patient.ts";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asOf = new URL(request.url).searchParams.get("asOf") ?? undefined;
  if (asOf && !IsoDate.safeParse(asOf).success)
    return Response.json({ error: "Invalid evidence date." }, { status: 400 });
  try {
    const patientId = patientIdFromRequest(request);
    const fact = (
      await loadFacts(await evidenceWindow(asOf, patientId), undefined, patientId)
    ).find((item) => item.id === id);
    if (!fact)
      return Response.json(
        { error: "This fact is not available in the evidence window." },
        { status: 404 },
      );
    return Response.json(
      { id: fact.id, contentHash: fact.contentHash },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Fact identity unavailable",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        error:
          "The fact identity could not be loaded. Retry when the evidence service is available.",
      },
      { status: 503 },
    );
  }
}
