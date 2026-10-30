"use client";

import { useEffect, useState } from "react";
import { parseSourceResource, type SourceResources } from "../source-resource";

export function useSourceResource<K extends keyof SourceResources>(kind: K, id: string | null) {
  const [state, setState] = useState<{
    key: string;
    data: SourceResources[K] | null;
    error: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${kind}:${id}:${attempt}`;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void fetch(`/api/${kind}/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source unavailable");
        const body: unknown = await response.json();
        const data = parseSourceResource(kind, id, body);
        if (!controller.signal.aborted) setState({ key, data, error: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("source_unavailable", error instanceof Error ? error.name : "Unknown");
        setState({ key, data: null, error: true });
      });
    return () => controller.abort();
  }, [kind, id, key]);
  const current = state?.key === key ? state : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? false,
    retry: () => setAttempt((value) => value + 1),
  };
}
