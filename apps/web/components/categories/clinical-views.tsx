import { labUiPoints, medicationUiLists } from "@medlyn/engine/agent/ui-tools";
import { isShowable, validateClaims } from "@medlyn/engine/claims/validate";
import { trendLines } from "@medlyn/engine/lens/templates";
import { CardContent } from "@/components/ui/card";
import { MeasurementCard } from "./measurement-card";
import { MedicationSourceLists } from "./medication-source-lists";
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
      <MedicationSourceLists output={output} />
    </SharedDataView>
  );
}
export async function LabTrends({ data, rows }: { data: PatientData; rows: PatientRow[] }) {
  const lines = evidenceLines(rows);
  const measures = [
    { key: "weight", title: "Weight" },
    { key: "hba1c", title: "HbA1c" },
    { key: "blood_pressure", title: "Blood pressure" },
    { key: "ejection_fraction", title: "Ejection fraction" },
  ];
  const charts = await Promise.all(
    measures.map(async ({ key, title }) => {
      const points = labUiPoints(data.facts, lines, key);
      if (!points.length) return null;
      const ids = new Set(
        points.flatMap((point) => point.sources?.map((source) => source.factId) ?? [point.factId]),
      );
      const selected = data.facts.filter((fact) => ids.has(fact.id));
      const deltas = trendLines(selected, data).filter((line) => line.factIds.length > 1);
      const checked = await validateClaims(deltas, data);
      return (
        <MeasurementCard
          key={key}
          title={title}
          points={points}
          deltaLine={checked.find(isShowable) ?? null}
        />
      );
    }),
  );
  return (
    <SharedDataView>
      <CardContent className="grid gap-4 px-0 md:grid-cols-2">{charts}</CardContent>
    </SharedDataView>
  );
}
