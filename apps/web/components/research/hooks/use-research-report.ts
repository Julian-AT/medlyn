"use client";
import { useEffect, useState } from "react";
export function useResearchReport<T>(name: "cohort" | "evaluation") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    void fetch(`/api/research/${name}?attempt=${attempt}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Research report unavailable");
        const next = (await response.json()) as T;
        if (!controller.signal.aborted) setData(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [name, attempt]);
  return { data, error, retry: () => setAttempt((value) => value + 1) };
}
