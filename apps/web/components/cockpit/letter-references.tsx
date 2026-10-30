"use client";
import { Document } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { useEffect, useState } from "react";
import { SourceChips } from "@/components/sources/source-chips";
import { CardContent, CardDescription } from "@/components/ui/card";
export function LetterReferences({ citations, asOf }: { citations: string[]; asOf: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/patient/documents?asOf=${encodeURIComponent(asOf)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Document references unavailable");
        const body = await response.json();
        const next = Document.array().parse(body.documents);
        if (!controller.signal.aborted) setDocuments(next);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          console.warn(
            "letter_references_unavailable",
            error instanceof Error ? error.name : "Unknown",
          );
      });
    return () => controller.abort();
  }, [asOf]);
  return (
    <CardContent className="flex flex-col gap-2 p-0">
      <SourceChips
        sources={citations.map((segmentId, index) => ({ segmentId, label: `Source ${index + 1}` }))}
      />
      {citations.map((segmentId, index) => {
        const document = documents.find((item) => item.id === segmentId.split("-s")[0]);
        return (
          <CardDescription key={segmentId} className="hidden text-xs print:block">
            [{index + 1}]{" "}
            {document
              ? `${document.titleEn || document.title}, ${formatDate(document.docDate)}`
              : "Source document"}
          </CardDescription>
        );
      })}
    </CardContent>
  );
}
