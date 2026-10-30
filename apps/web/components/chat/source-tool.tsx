"use client";

import { useEffect } from "react";
import { SourceChip } from "@/components/gen-ui/source-chip";
import { ToolFrame } from "@/components/gen-ui/tool-frame";

function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceTool({
  segmentId,
  autoOpen = false,
  state,
}: {
  segmentId: string;
  autoOpen?: boolean;
  state: string;
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
    <ToolFrame
      state={state === "output-error" || state === "output-denied" ? state : "output-available"}
      output={{ segmentId }}
      title="Source passage"
    >
      <SourceChip segmentId={segmentId} />
    </ToolFrame>
  );
}
