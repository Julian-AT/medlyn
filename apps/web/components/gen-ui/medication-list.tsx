"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { SourceChips } from "@/components/sources/source-chips";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { groupEvidence } from "@/lib/group-evidence";
import { displayDates } from "./display-dates";

export function MedicationList({
  list,
}: {
  list: UiToolOutputs["show_medications"]["lists"][number];
}) {
  const facts = usePatientFacts();
  const groups = groupEvidence(
    list.lines,
    (item) => item.line,
    (item) => facts.get(item.factId),
  );
  return (
    <CardContent className="flex flex-col gap-3 p-0 [&>[data-slot=table-container]]:max-h-[36rem]">
      <CardTitle className="text-sm font-semibold">{displayDates(list.listLabel)}</CardTitle>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="h-10 text-xs">Medication</TableHead>
            <TableHead className="h-10 text-xs">Schedule</TableHead>
            <TableHead className="h-10 text-xs">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map(({ item, sources }) => (
            <TableRow className="h-10" key={item.factId} data-claim-id={item.line.id}>
              <TableCell className="max-w-80 whitespace-normal py-2 text-sm tabular-nums">
                <CardDescription className="text-foreground">
                  {displayDates(item.line.text)}
                </CardDescription>
                <CardContent className="flex flex-wrap gap-1 p-0">
                  {item.line.assertion !== "present" && (
                    <Badge variant="outline" className="mt-1">
                      {item.line.assertion}
                    </Badge>
                  )}
                  {item.line.temporalStatus !== "stated" && (
                    <Badge variant="secondary" className="mt-1">
                      {item.line.temporalStatus.replaceAll("_", " ")}
                    </Badge>
                  )}
                </CardContent>
              </TableCell>
              <TableCell className="py-2 font-mono text-xs tabular-nums">
                {item.schedule || "—"}
              </TableCell>
              <TableCell className="py-2">
                <SourceChips
                  sources={sources.map((entry) => ({
                    segmentId: entry.segmentId,
                    quote: entry.quote,
                    date: facts.get(entry.factId)?.docDate,
                  }))}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  );
}
