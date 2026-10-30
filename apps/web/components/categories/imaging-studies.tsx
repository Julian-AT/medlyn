import { formatDate } from "@medlyn/engine/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryProjections } from "./category-projections";
import { EvidenceRow } from "./evidence-row";
import type { PatientData, PatientRow } from "./patient-data";
export function ImagingStudies({ data, rows }: { data: PatientData; rows: PatientRow[] }) {
  return (
    <CardContent className="grid min-w-0 gap-4 p-0 md:grid-cols-2">
      {data.documents
        .filter((document) => rows.some(({ fact }) => fact.documentId === document.id))
        .map((document) => (
          <Card
            key={document.id}
            className="min-w-0 gap-4 rounded-2xl border p-4 shadow-none ring-0"
          >
            <CardHeader className="p-0">
              <CardTitle className="text-base">{document.titleEn || document.title}</CardTitle>
              <CardDescription className="tabular-nums">
                {formatDate(document.docDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-0">
              {categoryProjections(rows.filter(({ fact }) => fact.documentId === document.id)).map(
                (group) => (
                  <EvidenceRow key={group.key} row={group.latest} />
                ),
              )}
            </CardContent>
          </Card>
        ))}
    </CardContent>
  );
}
