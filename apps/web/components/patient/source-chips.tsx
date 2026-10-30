"use client";

import { formatDate } from "@medlyn/engine/dates";
import { SourceChip as EvidenceChip } from "@/components/cockpit/source-chip";
import { SourceChip } from "@/components/gen-ui/source-chip";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Source = { segmentId: string; quote?: string; label?: string; date?: string };

export function SourceChips({
  sources,
  onOpen,
}: {
  sources: Source[];
  onOpen?: (id: string) => void;
}) {
  const ordered = [...sources].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const unique = ordered.filter(
    (source, index) => ordered.findIndex((item) => item.segmentId === source.segmentId) === index,
  );
  const chip = (source: Source) =>
    onOpen ? (
      <EvidenceChip
        key={source.segmentId}
        segmentId={source.segmentId}
        label={source.label ?? (source.date ? formatDate(source.date) : undefined)}
        onOpen={onOpen}
      />
    ) : (
      <SourceChip
        key={source.segmentId}
        segmentId={source.segmentId}
        quote={source.quote}
        label={source.label ?? (source.date ? formatDate(source.date) : "Source")}
      />
    );
  return (
    <CardContent className="flex flex-wrap items-center gap-1.5 px-0 py-0">
      {unique.slice(0, 1).map(chip)}
      {unique.length > 1 && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-xs">
              +{unique.length - 1} sources
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="max-h-72 w-80 overflow-y-auto">
            <CardContent className="flex flex-col items-start gap-2 p-0">
              {unique.slice(1).map(chip)}
            </CardContent>
          </HoverCardContent>
        </HoverCard>
      )}
    </CardContent>
  );
}
