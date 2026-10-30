"use client";
import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { formatDate } from "@medlyn/engine/dates";
import { MedicationChanges } from "@/components/gen-ui/medication-changes";
import { MedicationList } from "@/components/gen-ui/medication-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
export function MedicationSourceLists({ output }: { output: UiToolOutputs["show_medications"] }) {
  const lists = [...output.lists].sort((a, b) => b.date.localeCompare(a.date));
  if (!lists.length) return null;
  const key = (item: (typeof lists)[number]) => `${item.documentId}:${item.listLabel}`;
  return (
    <Card className="min-w-0 gap-4 rounded-none bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="p-0">
        <CardTitle>Medication source lists</CardTitle>
        <CardDescription>
          As of {formatDate(output.asOf)}. Each list reflects its source document.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        <Tabs defaultValue={key(lists[0])} className="min-w-0">
          <TabsList className="h-auto flex-wrap justify-start" aria-label="Medication source lists">
            {lists.map((item) => (
              <TabsTrigger
                key={key(item)}
                value={key(item)}
                className="h-8 whitespace-normal rounded-control"
              >
                {item.listLabel.replace(/\d{4}-\d{2}-\d{2}/g, (date) => formatDate(date))}
              </TabsTrigger>
            ))}
          </TabsList>
          {lists.map((item) => (
            <TabsContent key={key(item)} value={key(item)}>
              <MedicationList list={item} />
            </TabsContent>
          ))}
        </Tabs>
        {output.changes.length > 0 && <MedicationChanges changes={output.changes} />}
      </CardContent>
    </Card>
  );
}
