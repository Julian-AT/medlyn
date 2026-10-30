"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import type { Fact } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { medicationSourceLists } from "./medication-data";
import { MedicationEmptyState } from "./medication-empty-state";
import { MedicationListChanges } from "./medication-list-changes";
import { MedicationSkeleton } from "./medication-skeleton";
import { MedicationSourceTable } from "./medication-source-table";

export function MedicationSourceLists({
  output,
  facts,
}: {
  output: UiToolOutputs["show_medications"];
  facts?: Fact[];
}) {
  const patientFacts = usePatientFacts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (!facts && !patientFacts.size && output.lists.length) return <MedicationSkeleton />;
  const lists = medicationSourceLists(
    output.lists,
    facts ? new Map(facts.map((fact) => [fact.id, fact])) : patientFacts,
  );
  const selected = lists.find((list) => list.id === selectedId) ?? lists[0];
  if (!selected) return <MedicationEmptyState />;
  const previous = lists[lists.indexOf(selected) + 1];
  return (
    <CardContent className="flex min-w-0 flex-col gap-6 p-0">
      <Tabs value={selected.id} onValueChange={setSelectedId} className="min-w-0 gap-4">
        <CardContent className="flex min-w-0 flex-col gap-3 p-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-0">
            <CardDescription className="text-xs font-medium">Source lists</CardDescription>
            <CardDescription className="text-xs tabular-nums">
              Available as of {formatDate(output.asOf)}
            </CardDescription>
          </CardContent>
          <TabsList
            className="h-auto max-w-full flex-wrap justify-start gap-1 rounded-xl p-1 group-data-horizontal/tabs:h-auto"
            aria-label="Medication source lists"
          >
            {lists.map((list) => (
              <TabsTrigger
                key={list.id}
                value={list.id}
                className="h-auto min-h-9 min-w-0 max-w-full flex-none whitespace-normal break-words rounded-lg px-3 py-2 text-left text-sm leading-snug tabular-nums"
              >
                {list.listLabel}
              </TabsTrigger>
            ))}
          </TabsList>
        </CardContent>
        {lists.map((list) => (
          <TabsContent key={list.id} value={list.id} className="min-w-0">
            <MedicationSourceTable list={list} />
          </TabsContent>
        ))}
      </Tabs>
      <MedicationListChanges selected={selected} previous={previous} />
    </CardContent>
  );
}
