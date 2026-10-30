"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClaimLine } from "./claim-line";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function MedicationTable(props: ToolProps<UiToolOutputs["show_medications"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      title="Medication lists"
      description={output ? `As of ${output.asOf}` : undefined}
    >
      {output?.lists.length === 0 ? (
        <CardDescription>No medication rows to display in this view.</CardDescription>
      ) : null}
      {output?.lists.map((list) => (
        <CardContent key={`${list.documentId}:${list.listLabel}`} className="space-y-2 px-0">
          <CardTitle className="text-xs font-medium tabular-nums">{list.listLabel}</CardTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 text-xs">Medication</TableHead>
                <TableHead className="h-8 text-xs">Schedule</TableHead>
                <TableHead className="h-8 text-xs">Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.lines.map((item) => (
                <TableRow key={item.factId}>
                  <TableCell className="max-w-80 whitespace-normal py-2 text-sm tabular-nums">
                    {item.line.text}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-xs tabular-nums">
                    {item.schedule || "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <SourceChip segmentId={item.segmentId} quote={item.quote} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      ))}
      {output?.changes.length ? (
        <CardContent className="space-y-3 border-t px-0 pt-3">
          <CardTitle className="text-xs">Changes between source lists</CardTitle>
          {output.changes.map((change) => (
            <CardContent
              key={`${change.from.factId}:${change.to.factId}`}
              className="space-y-2 px-0"
            >
              <CardDescription className="text-xs tabular-nums">
                {change.fromDate} → {change.toDate}
              </CardDescription>
              <ClaimLine {...change.from} />
              <ClaimLine {...change.to} />
            </CardContent>
          ))}
        </CardContent>
      ) : null}
    </ToolFrame>
  );
}
