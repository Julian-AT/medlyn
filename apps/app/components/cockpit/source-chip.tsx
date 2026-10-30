"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type PassageView as Passage, PassageView } from "@medlyn/engine/contracts";
import { SourcePopover } from "@/components/sources/source-popover";
import { Button } from "@/components/ui/button";

export async function fetchPassage(segmentId: string): Promise<Passage> {
  const response = await fetch(`/api/passage/${encodeURIComponent(segmentId)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Passage unavailable");
  return PassageView.parse(await response.json());
}

export function SourceChip({
  segmentId,
  index,
  label,
}: {
  segmentId: string;
  index?: number;
  label?: string;
  onOpen?: (id: string) => void;
}) {
  return (
    <SourcePopover
      segmentId={segmentId}
      trigger={
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-5 gap-1 rounded-full px-2 text-xs [&_svg]:size-3"
          aria-label={`Open source ${index ?? segmentId}`}
        >
          <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
          {label ?? (index ? `Source ${index}` : "Source")}
        </Button>
      }
    />
  );
}
