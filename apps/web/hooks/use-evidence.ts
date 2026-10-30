"use client";
import { DocumentView, type PassageView } from "@medlyn/engine/contracts";
import { useEffect, useRef, useState } from "react";
import { fetchPassage } from "@/components/cockpit/source-chip";

export function useEvidence(segmentId: string | null, comparing: boolean) {
  const [language, setLanguage] = useState("de");
  const [passage, setPassage] = useState<PassageView | null>(null);
  const [document, setDocument] = useState<DocumentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const selected = useRef<HTMLParagraphElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt re-runs the fetch on retry
  useEffect(() => {
    if (!segmentId || comparing) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setPassage(null);
    setDocument(null);
    fetchPassage(segmentId)
      .then(async (value) => {
        if (!alive) return;
        setPassage(value);
        const response = await fetch(`/api/document/${encodeURIComponent(value.document.id)}`);
        if (!response.ok)
          throw new Error("Full document unavailable. The selected passage is shown below.");
        const full = DocumentView.parse(await response.json());
        if (alive) setDocument(full);
      })
      .catch((cause) => {
        if (alive) setError(cause instanceof Error ? cause.message : "Source unavailable. Retry.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [segmentId, comparing, attempt]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: language change re-centres the highlighted passage
  useEffect(() => {
    if (passage && !loading)
      selected.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [passage, loading, language]);

  return {
    language,
    setLanguage,
    passage,
    document,
    error,
    loading,
    selected,
    retry: () => setAttempt((value) => value + 1),
  };
}
