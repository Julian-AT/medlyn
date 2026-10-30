import { cookies } from "next/headers";
import { PATIENT_COOKIE, validPatientId } from "@/lib/active-patient";
import { patientList } from "@/lib/patient-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const patientId = body && typeof body === "object" && "patientId" in body ? body.patientId : null;
  if (!validPatientId(patientId))
    return Response.json({ error: "Invalid patient" }, { status: 400 });
  if (!(await patientList()).some((patient) => patient.id === patientId))
    return Response.json({ error: "Patient not found" }, { status: 404 });
  (await cookies()).set(PATIENT_COOKIE, patientId, {
    path: "/",
    sameSite: "lax",
    maxAge: 31536000,
    httpOnly: true,
  });
  return Response.json({ patientId }, { headers: { "Cache-Control": "no-store" } });
}
