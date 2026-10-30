import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  File02Icon,
  Medicine01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PatientData } from "./patient-data";

export function OverviewStats({ data }: { data: PatientData }) {
  const stats = [
    { label: "Source documents", value: data.documents.length, icon: File02Icon },
    { label: "Verified entries", value: data.rows.length, icon: CheckmarkCircle02Icon },
    {
      label: "Medication sources",
      value: new Set(
        data.facts.filter((fact) => fact.kind === "medication").map((fact) => fact.documentId),
      ).size,
      icon: Medicine01Icon,
    },
    {
      label: "Planned entries",
      value: data.rows.filter(({ fact }) => fact.temporalStatus === "planned").length,
      icon: Calendar03Icon,
    },
  ];
  return (
    <CardContent className="grid gap-4 px-0 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, icon }) => (
        <Card key={label} className="gap-3 rounded-2xl border shadow-none ring-0">
          <CardHeader className="gap-3">
            <CardDescription className="font-medium">{label}</CardDescription>
            <CardTitle className="font-mono text-3xl font-semibold tracking-tight text-primary">
              {value}
            </CardTitle>
            <CardAction className="text-foreground/80">
              <HugeiconsIcon icon={icon} size={20} strokeWidth={1.75} aria-hidden="true" />
            </CardAction>
          </CardHeader>
        </Card>
      ))}
    </CardContent>
  );
}
