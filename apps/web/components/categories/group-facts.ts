import type { PatientRow } from "./patient-data";
export function datedRows(rows: PatientRow[]) {
  return [...rows].sort(
    (a, b) =>
      (a.fact.eventDate ?? a.fact.docDate).localeCompare(b.fact.eventDate ?? b.fact.docDate) ||
      a.fact.id.localeCompare(b.fact.id),
  );
}
