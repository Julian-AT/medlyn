"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { type Artifact, parseArtifact } from "../artifact-state";

export function useArtifact() {
  const params = useSearchParams();
  const artifact = parseArtifact(params.get("artifact"), params.get("artifactSegment"));
  const [width, setWidth] = useState(45);
  const select = useCallback((next: Artifact | null) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("artifactSegment");
    if (next) {
      url.searchParams.set("artifact", `${next.kind}:${next.id}`);
      if (next.segmentId) url.searchParams.set("artifactSegment", next.segmentId);
    } else url.searchParams.delete("artifact");
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("medlyn:artifact-width"));
      if (saved >= 30 && saved <= 65) setWidth(saved);
    } catch (error) {
      console.warn("artifact_width_unavailable", error instanceof Error ? error.name : "Unknown");
    }
    const open = (event: Event) => {
      const detail = (event as CustomEvent<Artifact>).detail;
      const next = detail && parseArtifact(`${detail.kind}:${detail.id}`, detail.segmentId);
      if (next) select(next);
    };
    window.addEventListener("medlyn:open-artifact", open);
    return () => {
      window.removeEventListener("medlyn:open-artifact", open);
    };
  }, [select]);
  const rememberWidth = (value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.min(65, Math.max(30, value));
    setWidth(next);
    try {
      localStorage.setItem("medlyn:artifact-width", String(next));
    } catch (error) {
      console.warn("artifact_width_unavailable", error instanceof Error ? error.name : "Unknown");
    }
  };
  return { artifact, select, width, rememberWidth };
}
