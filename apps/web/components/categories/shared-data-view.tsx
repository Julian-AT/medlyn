"use client";
import { type ReactNode, useEffect, useState } from "react";
import { EvidenceSheet } from "./evidence-sheet";
export function SharedDataView({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => {
    function show(event: Event) {
      const detail: unknown = (event as CustomEvent).detail;
      if (
        detail &&
        typeof detail === "object" &&
        "segmentId" in detail &&
        typeof detail.segmentId === "string"
      )
        setSource(detail.segmentId);
    }
    window.addEventListener("medlyn:show-source", show);
    return () => window.removeEventListener("medlyn:show-source", show);
  }, []);
  return (
    <>
      {children}
      <EvidenceSheet segmentId={source} onClose={() => setSource(null)} />
    </>
  );
}
