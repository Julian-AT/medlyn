"use client";

import { File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDate } from "@medlyn/engine/dates";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { SourcePopover } from "./source-popover";
import { type SourceListEntry, SourcesListPopover } from "./sources-list-popover";

type Source = SourceListEntry & { date?: string; quote?: string };

export function SourceChips({ sources }: { sources: Source[] }) {
  const ordered = [...sources].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const unique = ordered.filter(
    (source, index) => ordered.findIndex((item) => item.segmentId === source.segmentId) === index,
  );
  const first = unique[0];
  if (!first) return null;
  return (
    <CardContent className="flex flex-wrap items-center gap-1.5 p-0">
      <SourcePopover
        segmentId={first.segmentId}
        documentId={first.documentId}
        trigger={
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-5 gap-1 rounded-full px-2 text-xs font-medium tabular-nums [&_svg]:size-3"
            aria-label={`Open source ${first.label ?? first.segmentId}`}
          >
            <HugeiconsIcon icon={File02Icon} strokeWidth={2} aria-hidden="true" />
            {first.label ?? (first.date ? formatDate(first.date) : "Source")}
          </Button>
        }
      />
      {unique.length > 1 && (
        <SourcesListPopover
          sources={unique.slice(1).map((source) => ({
            ...source,
            label: source.label ?? (source.date ? formatDate(source.date) : undefined),
          }))}
        />
      )}
    </CardContent>
  );
}
