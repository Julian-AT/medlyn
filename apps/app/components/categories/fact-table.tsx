"use client";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { SourceChips } from "@/components/sources/source-chips";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { groupEvidence } from "@/lib/group-evidence";
import { CategoryEmpty } from "./category-empty";
import { ClaimText } from "./claim-text";
import { type FactFilter, filterRows } from "./fact-filters.ts";
import { FactToolbar } from "./fact-toolbar.tsx";
import type { PatientRow } from "./patient-data";
export function FactTable({
  rows,
  title,
  description,
}: {
  rows: PatientRow[];
  title: string;
  description?: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FactFilter>("all");
  const grouped = groupEvidence(
    rows,
    (row) => row.claim,
    (row) => row.fact,
  );
  const filtered = new Set(filterRows(rows, query, filter).map((row) => row.fact.id));
  const visible = grouped.filter((group) => group.sources.some((row) => filtered.has(row.fact.id)));
  if (!rows.length) return <CategoryEmpty />;
  return (
    <Card className="@container/facts min-w-0 gap-5 rounded-none border-0 bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="px-0">
        <CardTitle className="font-semibold tracking-tight">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Badge variant="secondary" className="font-mono">
            {grouped.length} entries
          </Badge>
        </CardAction>
      </CardHeader>
      <FactToolbar query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
      <CardContent className="px-0 [&>[data-slot=table-container]]:max-h-[36rem] [&_[data-slot=table-row]]:border-gray-alpha-100">
        <Table className="table-fixed [&_th]:whitespace-normal">
          <TableHeader className="sticky top-0 z-10 bg-muted [&_[data-slot=table-head]]:h-10 [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-head]]:text-muted-foreground">
            <TableRow>
              <TableHead>Documented fact</TableHead>
              <TableHead className="hidden w-28 @xl/facts:table-cell">Date</TableHead>
              <TableHead className="hidden w-28 @xl/facts:table-cell">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(({ item: { fact, claim }, sources }) => (
              <TableRow key={claim.id} data-claim-id={claim.id}>
                <TableCell className="min-w-0 whitespace-normal py-4 align-top">
                  <ClaimText claim={claim} />
                  <CardContent className="flex flex-col items-start gap-2 px-0 pt-2 @xl/facts:hidden">
                    <CardDescription className="whitespace-nowrap font-mono text-xs tabular-nums">
                      {formatDate(fact.eventDate ?? fact.docDate, fact.datePrecision)}
                    </CardDescription>
                    <SourceChips
                      sources={sources.map(({ fact }) => ({
                        segmentId: fact.segmentId,
                        documentId: fact.documentId,
                        label: "Source",
                        date: fact.docDate,
                      }))}
                    />
                  </CardContent>
                  <CardContent className="flex flex-wrap gap-1 p-0">
                    {fact.assertion !== "present" && (
                      <Badge variant="outline" className="mt-2">
                        {
                          { negated: "Negated", suspected: "Suspected", historical: "Historical" }[
                            fact.assertion
                          ]
                        }
                      </Badge>
                    )}
                    {fact.temporalStatus !== "stated" && (
                      <Badge variant="outline" className="mt-2">
                        {
                          {
                            planned: "Planned",
                            recommended: "Recommended",
                            done: "Completed",
                            ongoing: "Ongoing",
                            given_once: "Given once",
                          }[fact.temporalStatus]
                        }
                      </Badge>
                    )}
                  </CardContent>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap py-4 align-top font-mono text-xs tabular-nums @xl/facts:table-cell">
                  {formatDate(fact.eventDate ?? fact.docDate, fact.datePrecision)}
                </TableCell>
                <TableCell className="hidden py-4 align-top @xl/facts:table-cell">
                  <SourceChips
                    sources={sources.map(({ fact }) => ({
                      segmentId: fact.segmentId,
                      documentId: fact.documentId,
                      label: "Source",
                      date: fact.docDate,
                    }))}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!visible.length && (
          <Empty className="min-h-48">
            <EmptyHeader>
              <EmptyTitle>No matching entries</EmptyTitle>
              <EmptyDescription>Try another search or choose All entries.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}
