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
import { MedicationSchedule } from "./medication-schedule";
import { MedicationStateBadges } from "./medication-state-badges";

export function MedicationSourceTable({ list }: { list: MedicationSourceList }) {
  return (
    <Card className="gap-0 rounded-2xl border py-0 shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-b p-4">
        <CardTitle className="text-sm font-semibold" role="heading" aria-level={2}>
          Medication list
        </CardTitle>
        <Badge variant="secondary" className="tabular-nums">
          {list.entries.length} {list.entries.length === 1 ? "medication" : "medications"}
        </Badge>
      </CardHeader>
      <CardDescription className="border-b px-4 py-2 text-xs sm:hidden">
        Scroll across the table to view schedules and sources.
      </CardDescription>
      <CardContent className="min-w-0 p-0">
        <Table className="min-w-[780px]">
          <TableCaption className="sr-only">{list.listLabel}</TableCaption>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead
                scope="col"
                className="h-14 w-full min-w-52 pl-4 text-xs text-muted-foreground"
              >
                Medication
              </TableHead>
              <TableHead scope="col" className="h-14 min-w-24 text-xs text-muted-foreground">
                Strength
              </TableHead>
              <TableHead scope="col" className="h-14 text-xs text-muted-foreground">
                <CardContent className="flex flex-col gap-1.5 p-0">
                  Schedule
                  <CardContent className="grid w-60 grid-cols-4 gap-1 p-0 text-center font-normal">
                    {MEDICATION_TIMES.map((time) => (
                      <CardDescription key={time} className="text-xs">
                        {time}
                      </CardDescription>
                    ))}
                  </CardContent>
                </CardContent>
              </TableHead>
              <TableHead scope="col" className="h-14 min-w-24 text-xs text-muted-foreground">
                Route
              </TableHead>
              <TableHead scope="col" className="h-14 pr-4 text-xs text-muted-foreground">
                Source
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.entries.map(({ id, attrs, evidence, sources, critical }) => (
              <TableRow key={id} data-claim-id={evidence.line.id}>
                <TableCell className="whitespace-normal py-3.5 pl-4">
                  <CardContent className="flex flex-col gap-1.5 p-0">
                    <CardContent className="flex flex-wrap items-center gap-2 p-0">
                      <CardTitle className="text-sm font-semibold leading-5">
                        {attrs.generic}
                      </CardTitle>
                      {critical && evidence.line.assertion === "present" && (
                        <Badge variant="destructive">Antithrombotic</Badge>
                      )}
                    </CardContent>
                    {attrs.brand && attrs.brand.toLowerCase() !== attrs.generic.toLowerCase() && (
                      <CardDescription className="text-xs">{attrs.brand}</CardDescription>
                    )}
                    <MedicationStateBadges line={evidence.line} />
                  </CardContent>
                </TableCell>
                <TableCell className="whitespace-normal py-3.5 font-mono text-sm tabular-nums">
                  {medicationStrength(attrs)}
                </TableCell>
                <TableCell className="py-3.5">
                  <MedicationSchedule attrs={attrs} />
                </TableCell>
                <TableCell className="max-w-32 whitespace-normal py-3.5 text-sm">
                  {medicationRoute(attrs.route)}
                </TableCell>
                <TableCell className="py-3.5 pr-4">
                  <SourceChips
                    sources={sources.map((source) => ({
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
