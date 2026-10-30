"use client";

import { type ReactElement, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SourceOverlay } from "./source-overlay";
import { SourcePassageContent } from "./source-passage-content";

export type SourceListEntry = { segmentId: string; documentId?: string; label?: string };

export function SourcesListPopover({
  sources,
  trigger,
}: {
  sources: SourceListEntry[];
  trigger?: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const unique = sources.filter(
    (source, index) => sources.findIndex((item) => item.segmentId === source.segmentId) === index,
  );
  if (!unique.length) return null;
  return (
    <SourceOverlay
      title={`${unique.length} ${unique.length === 1 ? "source" : "sources"}`}
      trigger={
        trigger ?? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-5 rounded-full px-2 text-xs font-medium"
          >
            {unique.length} {unique.length === 1 ? "source" : "sources"}
          </Button>
        )
      }
      open={open}
      onOpenChange={setOpen}
    >
      <CardContent className="space-y-2 p-0">
        {unique.map((source, index) => (
          <Collapsible
            key={source.segmentId}
            open={selected === source.segmentId}
            onOpenChange={(expanded) => setSelected(expanded ? source.segmentId : null)}
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-10 w-full justify-start whitespace-normal rounded-xl px-3 py-2 text-left text-sm"
              >
                {source.label || `Source ${index + 1}`} ·{" "}
                {selected === source.segmentId ? "Hide passage" : "Read passage"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {open && selected === source.segmentId && (
                <SourcePassageContent segmentId={source.segmentId} documentId={source.documentId} />
              )}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </CardContent>
    </SourceOverlay>
  );
}
