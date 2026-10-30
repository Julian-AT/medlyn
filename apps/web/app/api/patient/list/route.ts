import { patientList } from "@/lib/patient-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { patients: await patientList() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("patient_list_unavailable", error instanceof Error ? error.name : "Unknown");
    return Response.json({ error: "Patient list unavailable" }, { status: 503 });
  }
}
