"use client";

import { PassageView } from "@medlyn/engine/contracts";
import { useEffect, useState } from "react";

type SourceState = {
  segmentId: string;
  passage: PassageView | null;
  error: boolean;
};

export function useSourcePassage(segmentId: string | null) {
  const [state, setState] = useState<SourceState | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!segmentId) return;
    const controller = new AbortController();
    setState({ segmentId, passage: null, error: false });
    fetch(`/api/passage/${encodeURIComponent(segmentId)}?attempt=${attempt}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source unavailable");
        const passage = PassageView.parse(await response.json());
        if (passage.segment.id !== segmentId) throw new Error("Source identifier mismatch");
        if (!controller.signal.aborted) setState({ segmentId, passage, error: false });
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        console.warn("chat_source_unavailable", cause instanceof Error ? cause.name : "Unknown");
        setState({ segmentId, passage: null, error: true });
      });
    return () => controller.abort();
  }, [segmentId, attempt]);
  const current = state?.segmentId === segmentId ? state : null;
  return {
    passage: current?.passage ?? null,
    error: current?.error ?? false,
    retry: () => setAttempt((value) => value + 1),
  };
}
