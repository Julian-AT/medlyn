"use client";

import { ReviewEntry, type ReviewRequest, type Screen } from "@medlyn/engine/contracts";
import {
  activeReviews,
  dismissedItems,
  overlayScreen,
  reviewAnnotations,
  reviewTargetHash,
} from "@medlyn/engine/review/overlay";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ReviewHandler } from "@/components/cockpit/review-controls";

export function useReviews(raw: Screen | null, sessionId: string) {
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activeSession = useRef(sessionId);
  activeSession.current = sessionId;
  const version = useRef(0);
  useEffect(() => {
    setEntries([]);
    setError(null);
    if (!sessionId) return;
    let alive = true;
    const initialVersion = version.current;
    fetch(`/api/review?sessionId=${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Saved reviews could not be loaded.");
        const values = ReviewEntry.array().parse(await response.json());
        if (alive && initialVersion === version.current) setEntries(values);
      })
      .catch((cause) => {
        if (alive) setError(cause instanceof Error ? cause.message : "Review service unavailable.");
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);
  const screen = useMemo(() => (raw ? overlayScreen(raw, entries) : null), [raw, entries]);
  const dismissed = useMemo(() => (raw ? dismissedItems(raw, entries) : []), [raw, entries]);
  const onReview: ReviewHandler = async (targetType, targetId, action, extras) => {
    if (!sessionId) throw new Error("The review session is not ready.");
    let targetHash: string;
    if (targetType === "fact") {
      const response = await fetch(
        `/api/lens/fact/${encodeURIComponent(targetId)}${raw ? `?asOf=${raw.window.asOf}` : ""}`,
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Fact identity unavailable.");
      targetHash = body.contentHash;
    } else {
      if (!raw) throw new Error("Open a lens before reviewing.");
      const target =
        targetType === "card"
          ? raw.sections.flatMap((section) => section.cards).find((item) => item.id === targetId)
          : targetType === "finding"
            ? raw.findings.find((item) => item.id === targetId)
            : raw.openQuestions.find((item) => item.id === targetId);
      if (!target) throw new Error("This item has changed. Review the refreshed lens.");
      targetHash = reviewTargetHash(target);
    }
    await saveReview({
      sessionId,
      targetType,
      targetId,
      targetHash,
      action,
      author: "Clinician",
      ...extras,
    });
  };
  async function saveReview(request: ReviewRequest) {
    if (!sessionId || request.sessionId !== sessionId)
      throw new Error("The review session changed. Reload this item.");
    if (activeSession.current !== sessionId)
      throw new Error("The patient changed. Review the selected patient's lens.");
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "The review could not be saved.");
    if (activeSession.current !== sessionId) return;
    version.current++;
    setEntries((previous) => [...previous, ReviewEntry.parse(body)]);
    setError(null);
    toast.success(request.action === "leave_open" ? "Acknowledged, unresolved" : "Review saved");
  }
  async function reset() {
    try {
      const response = await fetch(`/api/review?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("The review layer could not be reset.");
      if (activeSession.current !== sessionId) return;
      version.current++;
      setEntries([]);
      setError(null);
      toast.success("Review layer reset");
    } catch (cause) {
      if (activeSession.current !== sessionId) return;
      toast.error(cause instanceof Error ? cause.message : "Review reset unavailable.");
    }
  }
  return {
    machineScreen: raw,
    screen,
    entries,
    count: activeReviews(entries).length,
    dismissed,
    error,
    onReview,
    saveReview,
    reset,
    annotations: reviewAnnotations(entries),
  };
}
