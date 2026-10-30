"use client";

import { ReviewEntry, type ReviewRequest, type Screen } from "@medlyn/engine/contracts";
import {
  activeReviews,
  dismissedItems,
  overlayScreen,
  reviewAnnotations,
  reviewMatches,
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
  const dismissed = useMemo(() => {
    if (!raw) return [];
    const questions = raw.openQuestions.filter((question) => {
      if (question.findingId) return false;
      const review = activeReviews(entries).findLast(
        (entry) => entry.targetType === "open_question" && entry.targetId === question.id,
      );
      return review?.action === "dismiss" && reviewMatches(review, question);
    });
    return [...dismissedItems(raw, entries), ...questions];
  }, [raw, entries]);
  const onReview: ReviewHandler = async (targetType, targetId, action, extras) => {
    if (!raw || !sessionId) throw new Error("Open a lens before reviewing.");
    let targetHash: string;
    if (targetType === "fact") {
      const response = await fetch(
        `/api/lens/fact/${encodeURIComponent(targetId)}?asOf=${raw.window.asOf}`,
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Fact identity unavailable.");
      targetHash = body.contentHash;
    } else {
      const target =
        targetType === "card"
          ? raw.sections.flatMap((section) => section.cards).find((item) => item.id === targetId)
          : targetType === "finding"
            ? raw.findings.find((item) => item.id === targetId)
            : raw.openQuestions.find((item) => item.id === targetId);
      if (!target) throw new Error("This item has changed. Review the refreshed lens.");
      targetHash = reviewTargetHash(target);
    }
    const request: ReviewRequest = {
      sessionId,
      targetType,
      targetId,
      targetHash,
      action,
      author: "Clinician",
      ...extras,
    };
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
    toast.success(action === "leave_open" ? "Acknowledged, unresolved" : "Review saved");
  };
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
    screen,
    entries,
    count: activeReviews(entries).length,
    dismissed,
    error,
    onReview,
    reset,
    annotations: reviewAnnotations(entries),
  };
}
