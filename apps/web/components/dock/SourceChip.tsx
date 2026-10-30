"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { File02Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceChip({ segmentId, label }: { segmentId: string; label?: string }) {
  return (
    <Badge asChild variant="outline">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => showSource(segmentId)}
        aria-label={`Open source ${segmentId}`}
      >
        <HugeiconsIcon
          icon={File02Icon}
          strokeWidth={2}
          aria-hidden="true"
          data-icon="inline-start"
        />
        {label ?? segmentId}
      </Button>
    </Badge>
  );
}
