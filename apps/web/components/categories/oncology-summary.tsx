import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EvidenceRow } from "./evidence-row";
import type { PatientRow } from "./patient-data";

export function OncologySummary({ rows }: { rows: PatientRow[] }) {
  const newest = [...rows].sort((a, b) => b.fact.docDate.localeCompare(a.fact.docDate));
  const sections = [
    {
      title: "Histology & grade",
      concepts: [
        /invasive.*(?:carcinoma|cancer)|ductal carcinoma/i,
        /histolog.*grade|tumou?r grade/i,
      ],
    },
    {
      title: "TNM staging",
      concepts: [
        /primary tumo[u]?r stage|\bT category\b/i,
        /lymph node stage|\bN category\b/i,
        /metastasis stage|\bM category\b/i,
        /venous invasion/i,
      ],
    },
    {
      title: "Receptors & Ki-67",
      concepts: [/estrogen|oestrogen|\bER\b/i, /progesterone|\bPR\b/i, /HER.?2/i, /Ki.?67/i],
    },
    {
      title: "Tumour board & planned care",
      concepts: [
        /tumou?r board/i,
        /planned quadrantectomy/i,
        /planned intraoperative radiotherapy/i,
      ],
    },
  ]
    .map((section) => ({
      title: section.title,
      rows: [
        ...new Map(
          section.concepts.flatMap((pattern) => {
            const row = newest.find(({ fact }) => pattern.test(fact.labelEn));
            return row ? [[row.fact.id, row] as const] : [];
          }),
        ).values(),
      ],
    }))
    .filter((section) => section.rows.length);
  return (
    <Card className="gap-4 rounded-2xl border p-4 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Tumour summary</CardTitle>
        <CardDescription>
          Latest source for each summary field. Full findings and history follow below.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 p-0 md:grid-cols-2">
        {sections.map((section) => (
          <Card
            key={section.title}
            className="min-w-0 gap-3 rounded-none bg-transparent py-0 shadow-none ring-0"
          >
            <CardHeader className="p-0">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-0">
              {section.rows.map((row) => (
                <EvidenceRow key={row.fact.id} row={row} />
              ))}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
