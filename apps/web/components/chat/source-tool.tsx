"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceTool({ segmentId }: { segmentId: string }) {
  useEffect(() => showSource(segmentId), [segmentId]);
  return (
    <Button variant="outline" onClick={() => showSource(segmentId)}>
      Open source
    </Button>
  );
}
