"use client";
import type { Document } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EvidenceSheet } from "./evidence-sheet";
export function DocumentsTable({
  documents,
}: {
  documents: (Document & { segmentId: string | null })[];
}) {
  const [source, setSource] = useState<string | null>(null);
  return (
    <>
      <Card className="rounded-xl border shadow-none ring-0">
        <CardHeader>
          <CardTitle>Source documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Read</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-mono text-xs">{formatDate(doc.docDate)}</TableCell>
                  <TableCell className="whitespace-normal">{doc.titleEn || doc.title}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {doc.department}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!doc.segmentId}
                      onClick={() => setSource(doc.segmentId)}
                    >
                      Open source
                    </Button>
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
