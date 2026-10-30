"use client";

import { EvidenceWindow, Finding, ReviewEntry, Screen } from "@medlyn/engine/contracts";
import { reviewTargetHash } from "@medlyn/engine/review/overlay";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { patientQuestions } from "../patient-questions";
import type { ReviewHandler } from "../review-controls";

export function usePatientQuestions() {
  const { patient } = useActivePatient();
  const { sessionId, reviews, setScreen } = useWorkspace();
  useEffect(() => {
    if (!sessionId || reviews.screen) return;
    try {
      const saved = sessionStorage.getItem(`medlyn:last-lens:${patient.id}:${sessionId}`);
      const parsed = saved ? Screen.safeParse(JSON.parse(saved)) : null;
      if (parsed?.success && parsed.data.patient.id === patient.id) setScreen(parsed.data);
    } catch (error) {
      console.warn("recent_lens_unavailable", error instanceof Error ? error.name : "Unknown");
    }
  }, [sessionId, reviews.screen, patient.id, setScreen]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [entries, setEntries] = useState<ReviewEntry[]>([]);
  const [window, setWindow] = useState<EvidenceWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetch(
      `/api/patient/findings?patientId=${encodeURIComponent(patient.id)}&attempt=${attempt}`,
      {
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Patient findings could not be loaded. Retry the check.");
        const body = await response.json();
        const next = Finding.array().parse(body.findings);
        const evidence = EvidenceWindow.parse(body.window);
        if (!controller.signal.aborted) {
          setFindings(next);
          setWindow(evidence);
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Findings unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [patient.id, attempt]);
  useEffect(() => {
    if (!sessionId) return;
    const controller = new AbortController();
    void fetch(`/api/review?sessionId=${encodeURIComponent(sessionId)}&attempt=${attempt}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Saved reviews could not be loaded.");
        const values = ReviewEntry.array().parse(await response.json());
        if (!controller.signal.aborted) setEntries(values);
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : "Reviews unavailable.");
      });
    return () => controller.abort();
  }, [sessionId, attempt]);
  const projection = patientQuestions(findings, reviews.screen, window, patient.id, entries);
  const { questions, visible, dismissed, hasLens } = projection;
  const onReview: ReviewHandler = async (targetType, targetId, action, extras) => {
    const target =
      targetType === "finding"
        ? findings.find((item) => item.id === targetId)
        : questions.find((item) => item.id === targetId);
    if (!target || !sessionId) throw new Error("Reload this page before reviewing the item.");
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        targetType,
        targetId,
        targetHash: reviewTargetHash(target),
        action,
        author: "Clinician",
        ...extras,
      }),
    });
    if (!response.ok) throw new Error("The review could not be saved. Retry.");
    const entry = ReviewEntry.parse(await response.json());
    setEntries((previous) => [...previous, entry]);
    toast.success(action === "leave_open" ? "Acknowledged, unresolved" : "Review saved");
  };
  return {
    findings,
    questions: visible,
    dismissed,
    entries,
    window,
    loading,
    error,
    onReview,
    hasLens,
    retry: () => setAttempt((value) => value + 1),
  };
}
