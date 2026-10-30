"use client";

import { FileText } from "lucide-react";
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
        <FileText data-icon="inline-start" />
        {label ?? segmentId}
      </Button>
    </Badge>
  );
}
