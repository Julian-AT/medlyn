import type { PatientOption } from "../../lib/active-patient.ts";

export const CASE_PATIENT_ID = "patient-0000-0001";

export function readablePatientName(id: string, value: string): string {
  const name = value.replace(/\s+/g, " ").trim();
  if (
    name &&
    name !== id &&
    name.length <= 100 &&
    !/^(?:synth-|patient-|unknown\b|unnamed\b|none$|null$|n\/a$|—$)/i.test(name)
  )
    return name;
  if (id === CASE_PATIENT_ID) return "Case patient";
  const number = id.match(/(\d+)$/)?.[1];
  return number ? `Synthetic patient ${number.padStart(4, "0")}` : "Synthetic patient";
}

export function uniquePatients(patients: PatientOption[]): PatientOption[] {
  const unique = new Map<string, PatientOption>();
  for (const patient of patients) {
    const previous = unique.get(patient.id);
    const displayName = readablePatientName(patient.id, patient.displayName);
    if (!previous || previous.displayName === readablePatientName(patient.id, "")) {
      unique.set(patient.id, { ...patient, displayName });
    }
  }
  return [...unique.values()].sort((a, b) => {
    if (a.id === CASE_PATIENT_ID) return -1;
    if (b.id === CASE_PATIENT_ID) return 1;
    return a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id);
  });
}

export function patientAge(birthDate: string | null, asOf: string): number | null {
  if (!birthDate || !validDate(birthDate) || !validDate(asOf) || birthDate > asOf) return null;
  const age =
    Number(asOf.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    Number(asOf.slice(5) < birthDate.slice(5));
  return age <= 130 ? age : null;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function patientSexLabel(sex: PatientOption["sex"]): string {
  return sex === "F" ? "Female" : sex === "M" ? "Male" : "—";
}
