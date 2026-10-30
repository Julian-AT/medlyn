"use client";

import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceChip({
  segmentId,
  label = "Source",
  quote,
}: {
  segmentId: string;
  label?: string;
  quote?: string;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 max-w-full gap-1 rounded-md px-2 text-xs font-normal shadow-none"
          aria-label={`Open source ${segmentId}`}
          onClick={() => showSource(segmentId)}
        >
          {label}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="max-w-80 whitespace-pre-wrap text-xs">
        {quote || segmentId}
      </HoverCardContent>
    </HoverCard>
  );
}
