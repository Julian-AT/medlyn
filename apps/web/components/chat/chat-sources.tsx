"use client";

import { CheckmarkCircle02Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Sources, SourcesTrigger } from "@/components/ai-elements/sources";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";

export function ChatSources({ segmentIds, checked }: { segmentIds: string[]; checked: boolean }) {
  if (!segmentIds.length && !checked) return null;
  return (
    <CardContent className="flex flex-wrap items-center gap-3 p-0">
      {segmentIds.length > 0 && (
        <Sources className="mb-0">
          <SourcesTrigger count={segmentIds.length} asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-medium"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("medlyn:show-source", { detail: { segmentId: segmentIds[0] } }),
                )
              }
            >
              <HugeiconsIcon icon={File02Icon} size={13} strokeWidth={2} aria-hidden="true" />
              {segmentIds.length} {segmentIds.length === 1 ? "source" : "sources"}
            </Button>
          </SourcesTrigger>
        </Sources>
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
