"use client";

import { CheckmarkCircle02Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SourcesListPopover } from "@/components/sources/sources-list-popover";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";

export function ChatSources({ segmentIds, checked }: { segmentIds: string[]; checked: boolean }) {
  if (!segmentIds.length && !checked) return null;
  return (
    <CardContent className="flex flex-wrap items-center gap-3 p-0">
      {segmentIds.length > 0 && (
        <SourcesListPopover
          sources={segmentIds.map((segmentId) => ({ segmentId }))}
          trigger={
            <Button
              variant="secondary"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium"
            >
              <HugeiconsIcon icon={File02Icon} size={13} strokeWidth={2} aria-hidden="true" />
              {segmentIds.length} {segmentIds.length === 1 ? "source" : "sources"}
            </Button>
          }
        />
      )}
      {checked && (
        <CardDescription className="flex items-center gap-1 text-[11px]">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            size={13}
            strokeWidth={2}
            aria-hidden="true"
          />
          Source checked
        </CardDescription>
      )}
    </CardContent>
  );
}
