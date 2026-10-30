import { evidenceWindow, loadDocuments } from "@medlyn/engine/store";
import { uniquePatients } from "@/components/patient/patient-options";
import { patientList } from "@/lib/patient-server";
import { identityFromDocuments } from "./patient-identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const patients = uniquePatients(await patientList());
    const resolved = [];
    for (let index = 0; index < patients.length; index += 8) {
      const batch = await Promise.all(
        patients.slice(index, index + 8).map(async (patient) => {
          const window = await evidenceWindow(undefined, patient.id);
          const sources = await loadDocuments(window, patient.id);
          return identityFromDocuments(
            { ...patient, asOf: window.asOf, documentCount: sources.length },
            sources.map((source) => source.normText),
          );
        }),
      );
      resolved.push(...batch);
    }
    return Response.json(
      {
        patients: uniquePatients(resolved),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.warn("patient_list_unavailable", error instanceof Error ? error.name : "Unknown");
    return Response.json({ error: "Patient list unavailable" }, { status: 503 });
  }
}
