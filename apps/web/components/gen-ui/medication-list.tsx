"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
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
import { SourceChip } from "./source-chip";

export function MedicationList({
  list,
}: {
  list: UiToolOutputs["show_medications"]["lists"][number];
}) {
  return (
    <CardContent className="flex flex-col gap-3 px-0 [&>[data-slot=table-container]]:max-h-[36rem]">
      <CardTitle className="text-sm font-semibold">{list.listLabel}</CardTitle>
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="h-10 text-xs">Medication</TableHead>
            <TableHead className="h-10 text-xs">Schedule</TableHead>
            <TableHead className="h-10 text-xs">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.lines
            .filter((item) => ["supported", "exempt"].includes(item.line.validation.support))
            .map((item) => (
              <TableRow key={item.factId} data-claim-id={item.line.id}>
                <TableCell className="max-w-80 whitespace-normal py-3 text-sm tabular-nums">
                  <CardDescription className="text-foreground">{item.line.text}</CardDescription>
                  <CardContent className="flex flex-wrap gap-1 px-0">
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
                <TableCell className="py-3 font-mono text-xs tabular-nums">
                  {item.schedule || "—"}
                </TableCell>
                <TableCell className="py-3">
                  <SourceChip segmentId={item.segmentId} quote={item.quote} />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </CardContent>
  );
}
