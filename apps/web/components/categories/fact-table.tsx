"use client";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { SourceChip } from "@/components/cockpit/source-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryEmpty } from "./category-empty";
import { EvidenceSheet } from "./evidence-sheet";
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
  if (!rows.length) return <CategoryEmpty />;
  return (
    <>
      <Card className="gap-4 rounded-xl border py-5 shadow-none ring-0">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documented fact</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ fact, claim }) => (
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
                    <SourceChip segmentId={fact.segmentId} onOpen={setSource} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <EvidenceSheet segmentId={source} onClose={() => setSource(null)} />
    </>
  );
}
