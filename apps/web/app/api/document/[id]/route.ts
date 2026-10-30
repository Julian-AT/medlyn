import { DocumentView } from "@medlyn/engine/contracts";
import { readDocument } from "@/lib/evidence-server";
import { patientIdFromRequest } from "../../../../lib/active-patient.ts";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id))
    return Response.json({ error: "Invalid document identifier." }, { status: 400 });
  try {
    const document = await readDocument(id);
    if (!document || document.document.patientId !== patientIdFromRequest(request))
      return Response.json({ error: "Document not found." }, { status: 404 });
    return Response.json(DocumentView.parse(document), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Document unavailable", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "The document could not be loaded." }, { status: 503 });
  }
}
