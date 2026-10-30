import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryAccent, type CategoryAccentKey } from "./category-accent";
import type { PatientData } from "./patient-data";

export function OverviewStats({ data }: { data: PatientData }) {
  const stats: { label: string; value: number; category: CategoryAccentKey }[] = [
    { label: "Source documents", value: data.documents.length, category: "documents" },
    { label: "Verified entries", value: data.rows.length, category: "verified" },
    {
      label: "Medication sources",
      value: new Set(
        data.facts.filter((fact) => fact.kind === "medication").map((fact) => fact.documentId),
      ).size,
      category: "medications",
    },
    {
      label: "Planned entries",
      value: data.rows.filter(({ fact }) => fact.temporalStatus === "planned").length,
      category: "procedures",
    },
  ];
  return (
    <CardContent className="grid gap-4 px-0 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, category }) => (
        <Card
          key={label}
          className="gap-3 rounded-2xl border border-gray-alpha-150 bg-card shadow-xs ring-0"
        >
          <CardHeader className="gap-3">
            <CardDescription className="font-medium">{label}</CardDescription>
            <CardTitle className="text-3xl font-medium tabular-nums text-foreground">
              {value}
            </CardTitle>
            <CardAction>
              <CategoryAccent category={category} className="size-9" />
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </CardContent>
  );
}
