"use client";

import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { DocumentReaderDialog } from "./document-reader-dialog";
import { useSourceResource } from "./hooks/use-source-resource";
import { SourceLanguageToggle } from "./source-language-toggle";
import { SourceLoadState } from "./source-load-state";
import { SourceSegment } from "./source-segment";

export function SourcePassageContent({
  segmentId,
  documentId,
}: {
  segmentId: string;
  documentId?: string;
}) {
  const { data, error, retry } = useSourceResource("passage", segmentId);
  const [language, setLanguage] = useState("de");
  if (!data) return <SourceLoadState error={error} retry={retry} />;
  if (documentId && documentId !== data.document.id) return <SourceLoadState error retry={retry} />;
  return (
    <CardContent className="space-y-4 p-0">
      <CardContent className="space-y-1 p-0">
        <CardTitle className="text-sm leading-5">
          {data.document.titleEn || data.document.title}
        </CardTitle>
        <CardDescription className="text-xs">
          {formatDate(data.document.docDate)} · {data.document.department}
        </CardDescription>
      </CardContent>
      <SourceLanguageToggle value={language} onChange={setLanguage} />
      <CardContent className="space-y-2 p-0">
        {data.before.slice(-1).map((segment) => (
          <SourceSegment key={segment.id} segment={segment} language={language} />
        ))}
        <SourceSegment segment={data.segment} language={language} cited />
        {data.after.slice(0, 1).map((segment) => (
          <SourceSegment key={segment.id} segment={segment} language={language} />
        ))}
      </CardContent>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 border-t px-0 pt-4">
        <CardDescription className="break-all font-mono text-xs">
          {data.document.id}@{data.segment.start}–{data.segment.end}
        </CardDescription>
        <DocumentReaderDialog documentId={data.document.id} highlight={data.segment.id} />
      </CardContent>
    </CardContent>
  );
}
