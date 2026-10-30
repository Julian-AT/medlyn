import type { PatientRow } from "./patient-data";

export type FactFilter = "all" | "planned" | "negated";

export function filterRows(rows: PatientRow[], query: string, filter: FactFilter) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(({ fact, claim }) => {
    if (filter === "planned" && fact.temporalStatus !== "planned") return false;
    if (filter === "negated" && fact.assertion !== "negated") return false;
    const text =
      `${claim.text} ${fact.kind} ${fact.docDate} ${fact.eventDate ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
