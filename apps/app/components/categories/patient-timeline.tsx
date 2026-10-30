"use client";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EvidenceRow } from "./evidence-row";
import { datedRows } from "./group-facts";
import type { PatientRow } from "./patient-data";

const filters = [
  { id: "all", title: "All events" },
  { id: "diagnosis", title: "Diagnoses" },
  { id: "procedure", title: "Procedures" },
  { id: "medication", title: "Medication" },
  { id: "measurement", title: "Measurements" },
];
export function PatientTimeline({ rows }: { rows: PatientRow[] }) {
  const [filter, setFilter] = useState("all");
  const months = new Map<string, PatientRow[]>();
  for (const row of datedRows(rows).reverse()) {
    if (
      filter !== "all" &&
      row.fact.kind !== filter &&
      !(filter === "measurement" && row.fact.kind === "lab")
    )
      continue;
    const month = (row.fact.eventDate ?? row.fact.docDate).slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), row]);
  }
  return (
    <CardContent className="flex min-w-0 flex-col gap-6 p-0">
      <ToggleGroup
        type="single"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value);
        }}
        className="h-auto flex-wrap justify-start"
        aria-label="Timeline event kind"
      >
        {filters.map((item) => (
          <ToggleGroupItem
            key={item.id}
            value={item.id}
            className="h-8 rounded-control px-3 text-sm"
          >
            {item.title}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {[...months].map(([month, items]) => (
        <Card
          key={month}
          className="min-w-0 gap-4 rounded-none border-l-2 bg-transparent py-0 pl-4 shadow-none ring-0"
        >
          <CardHeader className="p-0">
            <CardTitle className="text-base tabular-nums">{formatDate(month, "month")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 p-0">
            {items.map((row) => (
              <EvidenceRow key={row.fact.id} row={row} />
            ))}
          </CardContent>
        </Card>
      ))}
    </CardContent>
  );
}
