"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { displayDates } from "./display-dates";
import { MedicationChanges } from "./medication-changes.tsx";
import { MedicationList } from "./medication-list.tsx";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function MedicationTable(props: ToolProps<UiToolOutputs["show_medications"]>) {
  const { output } = props;
  const listKey = (list: NonNullable<typeof output>["lists"][number]) =>
    `${list.documentId}:${list.listLabel}`;
  return (
    <ToolFrame
      {...props}
      title="Medication lists"
      description={output ? `Source-dated lists · As of ${displayDates(output.asOf)}` : undefined}
      action={output && <Badge variant="secondary">{output.lists.length} sources</Badge>}
    >
      {output?.lists.length ? (
        <Tabs defaultValue={listKey(output.lists[0])} className="min-w-0 gap-5">
          <TabsList
            className="h-auto max-w-full flex-wrap justify-start gap-1 rounded-xl"
            aria-label="Medication source lists"
          >
            {output.lists.map((list) => (
              <TabsTrigger
                key={listKey(list)}
                value={listKey(list)}
                className="h-8 max-w-full rounded-lg text-xs"
              >
                {displayDates(list.listLabel)}
              </TabsTrigger>
            ))}
          </TabsList>
          {output.lists.map((list) => (
            <TabsContent key={listKey(list)} value={listKey(list)}>
              <MedicationList list={list} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Empty className="min-h-40 p-4">
          <EmptyHeader>
            <EmptyTitle>No medication entries to display</EmptyTitle>
            <EmptyDescription>
              Open a situation to check a specific medication question.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {output?.changes.length ? <MedicationChanges changes={output.changes} /> : null}
    </ToolFrame>
  );
}
