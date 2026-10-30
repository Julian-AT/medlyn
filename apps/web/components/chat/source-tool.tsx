"use client";

import { useEffect } from "react";
import { SourcePopover } from "@/components/sources/source-popover";
import { Button } from "@/components/ui/button";

function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceTool({
  segmentId,
  autoOpen = false,
}: {
  segmentId: string;
  autoOpen?: boolean;
}) {
  useEffect(() => {
    if (!autoOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (active) showSource(segmentId);
    });
    return () => {
      active = false;
    };
  }, [segmentId, autoOpen]);
  return (
    <SourcePopover segmentId={segmentId} trigger={<Button variant="ghost">Open source</Button>} />
  );
}
