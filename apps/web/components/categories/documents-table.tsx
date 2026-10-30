"use client";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Document } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { DocumentReaderDialog } from "@/components/sources/document-reader-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export function DocumentsTable({
  documents,
  title = "Source documents",
}: {
  documents: (Document & { segmentId: string | null })[];
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = documents.filter((document) =>
    `${document.titleEn} ${document.title} ${document.department} ${document.docDate}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Card className="gap-5 rounded-none border-0 bg-transparent py-0 shadow-none ring-0">
      <CardHeader className="px-0">
        <CardTitle className="font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription>
          Open the original passages and their available translations.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary" className="font-mono">
            {documents.length} documents
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <InputGroup className="h-10 rounded-xl border-0 bg-gray-alpha-100 shadow-none sm:max-w-sm">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search source documents"
            placeholder="Search documents…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>
      </CardContent>
      <CardContent className="px-0 [&>[data-slot=table-container]]:max-h-[36rem] [&_[data-slot=table-row]]:border-gray-alpha-100">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background [&_[data-slot=table-head]]:h-10 [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-head]]:text-muted-foreground">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Read</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-mono text-xs">{formatDate(doc.docDate)}</TableCell>
                <TableCell className="whitespace-normal">{doc.titleEn || doc.title}</TableCell>
                <TableCell className="whitespace-normal text-muted-foreground">
                  {doc.department}
                </TableCell>
                <TableCell>
                  <DocumentReaderDialog
                    documentId={doc.id}
                    highlight={doc.segmentId ?? undefined}
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-10 rounded-full"
                      >
                        Read document
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  {query.trim()
                    ? "No documents match this search."
                    : "No source documents to display."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
