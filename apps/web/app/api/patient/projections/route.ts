import { assertWindowCurrent } from "@medlyn/engine/store";
import { categoryProjections } from "@/components/categories/category-projections";
import { patientData } from "@/components/categories/patient-data";
import { patientError, patientHeaders, patientRequest } from "../request.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { patientId, window, kinds } = await patientRequest(request);
    const data = await patientData(patientId, window.asOf);
    const rows = data.rows.filter(({ fact }) => !kinds?.length || kinds.includes(fact.kind));
    await assertWindowCurrent(window, patientId);
    return Response.json(
      { window: data.window, groups: categoryProjections(rows) },
      { headers: patientHeaders },
    );
  } catch (error) {
    return patientError(error);
  }
}
