"use client";

import { useState } from "react";
import { FileText, ArrowUpRight } from "lucide-react";
import { PassageView, type PassageView as Passage } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const passages = new Map<string, Promise<Passage>>();
export function fetchPassage(segmentId: string): Promise<Passage> {
  const existing = passages.get(segmentId);
  if (existing) return existing;
  const request = fetch(`/api/passage/${encodeURIComponent(segmentId)}`)
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Passage unavailable");
      }
      return PassageView.parse(await response.json());
    })
    .catch((error) => {
      passages.delete(segmentId);
      throw error;
    });
  passages.set(segmentId, request);
  return request;
}

export function SourceChip({
  segmentId,
  index,
  onOpen,
}: {
  segmentId: string;
  index?: number;
  onOpen: (id: string) => void;
}) {
  const [preview, setPreview] = useState<Passage | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    try {
      setPreview(await fetchPassage(segmentId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Passage unavailable");
    }
  }
  return (
    <HoverCard
      onOpenChange={(open) => {
        if (open) void load();
      }}
    >
      <HoverCardTrigger asChild>
        <Badge variant="outline" asChild>
          <button
            type="button"
            aria-label={`Open source ${index ?? "passage"}`}
            onFocus={load}
            onClick={() => onOpen(segmentId)}
          >
            <FileText />
            {index ? `Source ${index}` : "Source"}
            <ArrowUpRight />
          </button>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="flex w-96 max-w-[90vw] flex-col gap-3">
        {preview ? (
          <>
            <strong>{preview.document.titleEn}</strong>
            <p className="font-mono text-xs text-muted-foreground">
              {formatDate(preview.document.docDate)} · German source
            </p>
            <p lang="de">{preview.segment.text}</p>
            <Separator />
            <p>{preview.segment.textEn ?? "English translation unavailable for this passage."}</p>
          </>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
