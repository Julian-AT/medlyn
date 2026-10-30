"use client";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { SourceChips } from "@/components/patient/source-chips";
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
import { EvidenceSheet } from "./evidence-sheet";
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
  const [source, setSource] = useState<string | null>(null);
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
    <>
      <Card className="gap-5 rounded-2xl border py-5 shadow-none ring-0">
        <CardHeader>
          <CardTitle className="font-semibold tracking-tight">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          <CardAction>
            <Badge variant="secondary" className="font-mono">
              {grouped.length} entries
            </Badge>
          </CardAction>
        </CardHeader>
        <FactToolbar query={query} filter={filter} onQuery={setQuery} onFilter={setFilter} />
        <CardContent className="[&>[data-slot=table-container]]:max-h-[36rem]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead>Documented fact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(({ item: { fact, claim }, sources }) => (
                <TableRow key={claim.id} data-claim-id={claim.id}>
                  <TableCell className="max-w-xl whitespace-normal py-4">
                    <CardDescription className="text-foreground">{claim.text}</CardDescription>
                    {(fact.assertion !== "present" || fact.temporalStatus !== "stated") && (
                      <Badge variant="secondary" className="mt-2">
                        {[
                          fact.assertion !== "present" ? fact.assertion : null,
                          fact.temporalStatus !== "stated"
                            ? fact.temporalStatus.replaceAll("_", " ")
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Badge>
                    )}
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
                      onOpen={setSource}
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
      <EvidenceSheet segmentId={source} onClose={() => setSource(null)} />
    </>
  );
}
