"use client";

import { ReviewEntry, type ReviewRequest, type Screen } from "@medlyn/engine/contracts";
import { loadReviews } from "@medlyn/engine/review/load";
import {
  emptyReviewLoad,
  reduceReviewLoad,
  visibleReviewLoad,
} from "@medlyn/engine/review/load-state";
import {
  activeReviews,
  dismissedItems,
  overlayScreen,
  reviewAnnotations,
  reviewTargetHash,
} from "@medlyn/engine/review/overlay";
import { reviewScope } from "@medlyn/engine/review/session";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import type { ReviewHandler } from "@/components/cockpit/review-controls";
import { DEFAULT_PATIENT_ID } from "@/lib/active-patient";

export function useReviews(raw: Screen | null, sessionId: string, patientId: string) {
  const scope = reviewScope(sessionId, patientId);
  const [state, dispatch] = useReducer(reduceReviewLoad, emptyReviewLoad);
  const { entries, error, status } = visibleReviewLoad(state, scope);
  const [reload, setReload] = useState(0);
  const retry = useCallback(() => setReload((value) => value + 1), []);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const sequence = useRef(0);
  useEffect(() => {
    const requestId = ++sequence.current + reload;
    dispatch({ type: "start", scope, requestId });
    if (!scope) return;
    if (patientId !== DEFAULT_PATIENT_ID) {
      dispatch({ type: "loaded", scope, requestId, entries: [] });
      return;
    }
    const controller = new AbortController();
    void loadReviews(sessionId, patientId, controller.signal)
      .then((values) => {
        if (!controller.signal.aborted && activeScope.current === scope)
          dispatch({ type: "loaded", scope, requestId, entries: values });
      })
      .catch(() => {
        if (!controller.signal.aborted && activeScope.current === scope)
          dispatch({ type: "failed", scope, requestId });
      });
    return () => controller.abort();
  }, [scope, sessionId, patientId, reload]);
  useEffect(() => {
    if (!error || !scope) return;
    const id = `review-load:${scope}`;
    toast.error(error, {
      id,
      duration: Number.POSITIVE_INFINITY,
      closeButton: true,
      action: { label: "Retry", onClick: retry },
    });
    return () => {
      toast.dismiss(id);
    };
  }, [error, scope, retry]);
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
      if (!raw) throw new Error("Open a situation before reviewing.");
      const target =
        targetType === "card"
          ? raw.sections.flatMap((section) => section.cards).find((item) => item.id === targetId)
          : targetType === "finding"
            ? raw.findings.find((item) => item.id === targetId)
            : raw.openQuestions.find((item) => item.id === targetId);
      if (!target) throw new Error("This item has changed. Review the refreshed situation.");
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
    if (!scope || request.sessionId !== sessionId)
      throw new Error("The review session changed. Reload this item.");
    if (activeScope.current !== scope)
      throw new Error("The patient changed. Review the selected patient's situation.");
    const response = await fetch(`/api/review?patientId=${encodeURIComponent(patientId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "The review could not be saved.");
    if (activeScope.current !== scope) return;
    const entry = ReviewEntry.parse(body);
    if (entry.sessionId !== sessionId) throw new Error("The review session changed.");
    dispatch({ type: "saved", scope, entry });
    retry();
    toast.success(request.action === "leave_open" ? "Acknowledged, unresolved" : "Review saved");
  }
  async function reset() {
    try {
      if (!scope || activeScope.current !== scope)
        throw new Error("The review session is not ready.");
      const query = new URLSearchParams({ sessionId, patientId });
      const response = await fetch(`/api/review?${query}`, { method: "DELETE" });
      if (!response.ok) throw new Error("The review layer could not be reset.");
      if (activeScope.current !== scope) return;
      dispatch({ type: "reset", scope });
      toast.success("Review layer reset");
    } catch (cause) {
      if (activeScope.current !== scope) return;
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
    loading: status === "loading",
    retry,
    onReview,
    saveReview,
    reset,
    annotations: reviewAnnotations(entries),
  };
}
