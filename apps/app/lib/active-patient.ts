export const DEFAULT_PATIENT_ID = "patient-0000-0001";
export const PATIENT_COOKIE = "medlyn-patient";

export function validPatientId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

export type PatientOption = {
  id: string;
  displayName: string;
  sex: "F" | "M" | "X";
  birthDate: string | null;
  asOf: string;
  documentCount: number;
};

export function patientIdFromRequest(request: Request): string {
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${PATIENT_COOKIE}=`));
  const value = cookie?.slice(PATIENT_COOKIE.length + 1);
  return validPatientId(value) ? value : DEFAULT_PATIENT_ID;
}
