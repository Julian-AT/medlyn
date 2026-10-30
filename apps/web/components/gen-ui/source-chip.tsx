"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <Tooltip>
      <HoverCard>
        <TooltipTrigger asChild>
          <HoverCardTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full h-6 max-w-full gap-1 rounded-md px-1 text-[11px] font-normal text-muted-foreground shadow-none hover:text-foreground"
              aria-label={`Open source ${segmentId}`}
              onClick={() => showSource(segmentId)}
            >
              <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
              {label}
            </Button>
          </HoverCardTrigger>
        </TooltipTrigger>
        <HoverCardContent className="max-w-80 whitespace-pre-wrap text-xs">
          {quote || segmentId}
        </HoverCardContent>
      </HoverCard>
      <TooltipContent side="bottom">Open the original passage</TooltipContent>
    </Tooltip>
  );
}
