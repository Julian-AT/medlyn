"use client";

import { DocumentView } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function DocumentArtifact({
  documentId,
  segmentId,
}: {
  documentId: string;
  segmentId?: string;
}) {
  const [document, setDocument] = useState<DocumentView | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [language, setLanguage] = useState("de");
  const selected = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setDocument(null);
    fetch(`/api/document/${encodeURIComponent(documentId)}?attempt=${attempt}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Document unavailable");
        const parsed = DocumentView.parse(await response.json());
        if (parsed.document.id !== documentId) throw new Error("Document identifier mismatch");
        if (!controller.signal.aborted) setDocument(parsed);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        console.warn(
          "artifact_document_unavailable",
          cause instanceof Error ? cause.name : "Unknown",
        );
        setError(true);
      });
    return () => controller.abort();
  }, [documentId, attempt]);
  useEffect(() => {
    if (document && segmentId && language) selected.current?.scrollIntoView({ block: "center" });
  }, [document, segmentId, language]);
  if (error)
    return (
      <CardDescription>
        Couldn't load this document.{" "}
        <Button variant="link" onClick={() => setAttempt((value) => value + 1)}>
          Retry
        </Button>
      </CardDescription>
    );
  if (!document)
    return <Skeleton className="h-72 w-full rounded-2xl" aria-label="Loading full document" />;
  return (
    <Card className="gap-5 rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
      <CardHeader className="px-0">
        <CardTitle className="text-lg">{document.document.titleEn}</CardTitle>
        <CardDescription className="text-xs">
          {formatDate(document.document.docDate)} · {document.document.id}
        </CardDescription>
        <ToggleGroup
          type="single"
          value={language}
          onValueChange={(value) => value && setLanguage(value)}
          className="mt-3"
          aria-label="Document language"
        >
          <ToggleGroupItem value="de">German</ToggleGroupItem>
          <ToggleGroupItem value="en">English</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      {document.segments.map((segment) => (
        <CardContent
          key={segment.id}
          ref={segment.id === segmentId ? selected : undefined}
          className={`scroll-m-6 rounded-xl p-3 ${segment.id === segmentId ? "bg-warning/10" : ""}`}
        >
          <CardDescription
            lang={language}
            className={`whitespace-pre-wrap text-sm/relaxed text-foreground ${segment.kind === "heading" ? "font-semibold" : ""}`}
          >
            {language === "de"
              ? segment.text
              : (segment.textEn ?? "English translation unavailable.")}
          </CardDescription>
        </CardContent>
      ))}
    </Card>
  );
}
