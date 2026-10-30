"use client";

import { ArrowUpRight01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type PassageView as Passage, PassageView } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CardDescription } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export async function fetchPassage(segmentId: string): Promise<Passage> {
  const response = await fetch(`/api/passage/${encodeURIComponent(segmentId)}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json();
    throw new Error(body.error ?? "Passage unavailable");
  }
  return PassageView.parse(await response.json());
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
            <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
            {index ? `Source ${index}` : "Source"}
            <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} aria-hidden="true" />
          </button>
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="flex w-96 max-w-[90vw] flex-col gap-3">
        {preview ? (
          <>
            <strong>{preview.document.titleEn}</strong>
            <CardDescription className="font-mono text-xs">
              {formatDate(preview.document.docDate)} · German source
            </CardDescription>
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
