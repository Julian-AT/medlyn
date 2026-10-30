import { labUiPoints, medicationUiLists } from "@medlyn/engine/agent/ui-tools";
import { LabTrend } from "@/components/gen-ui/lab-trend";
import { MedicationTable } from "@/components/gen-ui/medication-table";
import { CardContent } from "@/components/ui/card";
import type { PatientData, PatientRow } from "./patient-data";
import { SharedDataView } from "./shared-data-view";

function evidenceLines(rows: PatientRow[]) {
  return rows.map(({ fact, claim }) => ({
    factId: fact.id,
    segmentId: fact.segmentId,
    documentId: fact.documentId,
    quote: fact.quote,
    line: claim,
  }));
}
export function MedicationView({ data, rows }: { data: PatientData; rows: PatientRow[] }) {
  const output = medicationUiLists(data.facts, evidenceLines(rows), data.window.asOf, "all");
  return (
    <SharedDataView>
      <MedicationTable state="output-available" output={output} />
    </SharedDataView>
  );
}
export function LabTrends({ data, rows }: { data: PatientData; rows: PatientRow[] }) {
  const lines = evidenceLines(rows);
  const measures = [
    { key: "weight", title: "Weight" },
    { key: "hba1c", title: "HbA1c" },
    { key: "blood_pressure", title: "Blood pressure" },
  ];
  return (
    <SharedDataView>
      <CardContent className="grid gap-4 px-0 lg:grid-cols-3">
        {measures.map(({ key, title }) => {
          const points = labUiPoints(data.facts, lines, key);
          return points.length ? (
            <LabTrend
              key={key}
              state="output-available"
              output={{ measure: title, asOf: data.window.asOf, points, deltaLine: null }}
            />
          ) : null;
        })}
      </CardContent>
    </SharedDataView>
  );
}
