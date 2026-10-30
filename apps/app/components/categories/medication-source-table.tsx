"use client";

import { SourceChips } from "@/components/sources/source-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MedicationSourceList } from "./medication-data";
import { MEDICATION_TIMES, medicationRoute, medicationStrength } from "./medication-format";
import { MedicationName } from "./medication-name";
import { MedicationSchedule } from "./medication-schedule";

export function MedicationSourceTable({ list }: { list: MedicationSourceList }) {
  return (
    <Card className="@container/medications min-w-0 gap-0 rounded-2xl border py-0 shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b p-4">
        <CardTitle className="text-sm font-semibold" role="heading" aria-level={2}>
          Medication list
        </CardTitle>
        <Badge variant="secondary" className="tabular-nums">
          {list.entries.length} {list.entries.length === 1 ? "medication" : "medications"}
        </Badge>
      </CardHeader>
      <CardContent className="min-w-0 p-0">
        <Table className="block w-full @3xl/medications:table @3xl/medications:table-fixed">
          <TableCaption className="sr-only">{list.listLabel}</TableCaption>
          <TableHeader className="hidden bg-muted/30 @3xl/medications:table-header-group">
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="h-14 pl-4 text-xs text-muted-foreground">
                Medication
              </TableHead>
              <TableHead scope="col" className="h-14 w-24 text-xs text-muted-foreground">
                Strength
              </TableHead>
              <TableHead scope="col" className="h-14 w-60 text-xs text-muted-foreground">
                <CardContent className="flex flex-col gap-1.5 p-0">
                  Schedule
                  <CardContent className="grid w-full grid-cols-4 gap-1 p-0 text-center font-normal">
                    {MEDICATION_TIMES.map((time) => (
                      <CardDescription key={time} className="text-xs">
                        {time}
                      </CardDescription>
                    ))}
                  </CardContent>
                </CardContent>
              </TableHead>
              <TableHead scope="col" className="h-14 w-28 text-xs text-muted-foreground">
                Route
              </TableHead>
              <TableHead scope="col" className="h-14 w-24 pr-4 text-xs text-muted-foreground">
                Source
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block @3xl/medications:table-row-group">
            {list.entries.map((entry) => (
              <TableRow
                key={entry.id}
                data-claim-id={entry.evidence.line.id}
                className="grid grid-cols-[minmax(0,1fr)_7rem] gap-x-3 gap-y-3 p-4 @3xl/medications:table-row @3xl/medications:p-0"
              >
                <TableCell className="col-span-2 block min-w-0 whitespace-normal p-0 align-top @3xl/medications:table-cell @3xl/medications:py-3.5 @3xl/medications:pr-3 @3xl/medications:pl-4">
                  <MedicationName entry={entry} />
                </TableCell>
                <TableCell className="block min-w-0 whitespace-normal p-0 align-top @3xl/medications:table-cell @3xl/medications:px-3 @3xl/medications:py-3.5">
                  <CardDescription className="pb-1 text-xs @3xl/medications:hidden">
                    Strength
                  </CardDescription>
                  <CardDescription className="whitespace-normal font-mono text-sm leading-snug text-foreground tabular-nums">
                    {medicationStrength(entry.attrs)}
                  </CardDescription>
                </TableCell>
                <TableCell className="col-span-2 row-start-3 block min-w-0 whitespace-normal p-0 align-top @3xl/medications:table-cell @3xl/medications:px-3 @3xl/medications:py-3.5">
                  <CardDescription className="pb-2 text-xs @3xl/medications:hidden">
                    Schedule
                  </CardDescription>
                  <MedicationSchedule attrs={entry.attrs} />
                </TableCell>
                <TableCell className="col-start-2 row-start-2 block min-w-0 whitespace-normal p-0 align-top @3xl/medications:table-cell @3xl/medications:px-3 @3xl/medications:py-3.5">
                  <CardDescription className="pb-1 text-xs @3xl/medications:hidden">
                    Route
                  </CardDescription>
                  <CardDescription className="break-words text-sm leading-snug text-foreground">
                    {medicationRoute(entry.attrs.route)}
                  </CardDescription>
                </TableCell>
                <TableCell className="col-span-2 block min-w-0 p-0 align-top @3xl/medications:table-cell @3xl/medications:py-3.5 @3xl/medications:pr-4 @3xl/medications:pl-3">
                  <SourceChips
                    sources={entry.sources.map((source) => ({
                      segmentId: source.segmentId,
                      documentId: source.documentId,
                      label: "Source",
                    }))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardDescription className="border-t px-4 py-3 text-xs">
        Schedule amounts as recorded in the source. — indicates no scheduled dose.
      </CardDescription>
    </Card>
  );
}
