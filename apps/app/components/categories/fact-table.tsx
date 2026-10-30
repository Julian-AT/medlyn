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
    <Card className="gap-5 rounded-none border-0 bg-transparent py-0 shadow-none ring-0">
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
              <TableHead className="w-3/5">Documented fact</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(({ item: { fact, claim }, sources }) => (
              <TableRow key={claim.id} data-claim-id={claim.id}>
                <TableCell className="max-w-xl whitespace-normal py-4">
                  <CardDescription className="text-foreground">{claim.text}</CardDescription>
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
                <TableCell className="font-mono text-xs">
                  {formatDate(fact.eventDate ?? fact.docDate, fact.datePrecision)}
                </TableCell>
                <TableCell>
                  <SourceChips
                    sources={sources.map(({ fact }) => ({
                      segmentId: fact.segmentId,
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
