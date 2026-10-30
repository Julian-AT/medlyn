"use client";

import { SourceChips } from "./evidence-sources";

export function showSource(segmentId: string) {
  window.dispatchEvent(new CustomEvent("medlyn:show-source", { detail: { segmentId } }));
}

export function SourceChip({ segmentId }: { segmentId: string; label?: string; quote?: string }) {
  return <SourceChips sources={[{ segmentId }]} />;
}
