import { labUiPoints } from "@medlyn/engine/agent/ui-tools";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasurementCard } from "./measurement-card";
import type { PatientData } from "./patient-data";
export const overviewMeasures = [
  { key: "blood_pressure", title: "Blood pressure" },
  { key: "weight", title: "Weight" },
  { key: "hba1c", title: "HbA1c" },
  { key: "ejection_fraction", title: "Ejection fraction" },
];
export function LatestValues({ data }: { data: PatientData }) {
  const lines = data.rows.map(({ fact, claim }) => ({
    factId: fact.id,
    segmentId: fact.segmentId,
    documentId: fact.documentId,
    quote: fact.quote,
    line: claim,
  }));
  const series = overviewMeasures
    .map((measure) => ({ ...measure, points: labUiPoints(data.facts, lines, measure.key) }))
    .filter((measure) => measure.points.length);
  if (!series.length) return null;
  return (
    <Card className="gap-4 rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Latest documented values</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {series.map((measure) => (
          <MeasurementCard
            key={measure.key}
            title={measure.title}
            points={measure.points}
            compact
          />
        ))}
      </CardContent>
    </Card>
  );
}
