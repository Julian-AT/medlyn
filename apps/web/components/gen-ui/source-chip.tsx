"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SourcePopover } from "@/components/sources/source-popover";
import { Button } from "@/components/ui/button";

export function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceChip({
  segmentId,
  label = "Source",
}: {
  segmentId: string;
  label?: string;
  quote?: string;
}) {
  return (
    <SourcePopover
      segmentId={segmentId}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 rounded-full px-3 text-xs"
          aria-label={`Open source ${segmentId}`}
        >
          <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
          {label}
        </Button>
      }
    />
  );
}
