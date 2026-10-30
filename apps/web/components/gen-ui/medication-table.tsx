"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { useState } from "react";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { groupEvidence } from "@/lib/group-evidence";
import { displayDates } from "./display-dates";
import { useToolPreview } from "./hooks/use-tool-preview";
import { MedicationChanges } from "./medication-changes.tsx";
import { MedicationList } from "./medication-list.tsx";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function MedicationTable(props: ToolProps<UiToolOutputs["show_medications"]>) {
  const { output } = props;
  const facts = usePatientFacts();
  const [selected, setSelected] = useState<string | null>(null);
  const listKey = (list: NonNullable<typeof output>["lists"][number]) =>
    `${list.documentId}:${list.listLabel}`;
  const current = output?.lists.find((list) => listKey(list) === selected) ?? output?.lists[0];
  const count = groupEvidence(
    current?.lines ?? [],
    (row) => row.line,
    (row) => facts.get(row.factId),
  ).length;
  const preview = useToolPreview(count, props.expanded, 5);
  return (
    <ToolFrame
      {...props}
      layout="table"
      title="Medication lists"
      description={output ? `Source-dated lists · As of ${displayDates(output.asOf)}` : undefined}
      action={preview.toggle}
    >
      {output?.lists.length ? (
        <Tabs
          value={current ? listKey(current) : undefined}
          onValueChange={setSelected}
          className="min-w-0 gap-4"
        >
          <TabsList
            className="h-auto min-h-9 max-w-full flex-wrap justify-start gap-1 rounded-control bg-muted"
            aria-label="Medication source lists"
          >
            {output.lists.map((list) => (
              <TabsTrigger
                key={listKey(list)}
                value={listKey(list)}
                className="h-8 max-w-full rounded-control text-xs"
              >
                {displayDates(list.listLabel)}
              </TabsTrigger>
            ))}
          </TabsList>
          {output.lists.map((list) => (
            <TabsContent key={listKey(list)} value={listKey(list)}>
              <MedicationList list={list} limit={preview.limit} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <ToolEmpty
          title="No medication entries to display"
          description="Open a situation to check a specific medication question."
        />
      )}
      {output?.changes.length ? <MedicationChanges changes={output.changes} /> : null}
    </ToolFrame>
  );
}
