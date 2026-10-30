"use client";

import { EvidenceWindow, Finding } from "@medlyn/engine/contracts";
import { reviewTargetHash } from "@medlyn/engine/review/overlay";
import { useEffect, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { useEvidence } from "@/hooks/use-evidence";
import { patientQuestions } from "../patient-questions";
import type { ReviewHandler } from "../review-controls";

export function usePatientQuestions(lensKey?: string) {
  const machineScreen = useEvidence(lensKey);
  const { patient } = useActivePatient();
  const { sessionId, reviews } = useWorkspace();
  const [findings, setFindings] = useState<Finding[]>([]);
  const entries = reviews.entries;
  const [window, setWindow] = useState<EvidenceWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFindings([]);
    setWindow(null);
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
  const projection = patientQuestions(findings, machineScreen, window, patient.id, entries);
  const { questions, visible, dismissed, hasLens } = projection;
  const onReview: ReviewHandler = async (targetType, targetId, action, extras) => {
    if (targetType === "fact") return reviews.onReview(targetType, targetId, action, extras);
    const target =
      targetType === "finding"
        ? findings.find((item) => item.id === targetId)
        : questions.find((item) => item.id === targetId);
    if (!target || !sessionId) throw new Error("Reload this page before reviewing the item.");
    await reviews.saveReview({
      sessionId,
      targetType,
      targetId,
      targetHash: reviewTargetHash(target),
      action,
      author: "Clinician",
      ...extras,
    });
  };
  return {
    findings,
    screen: machineScreen,
    questions: visible,
    dismissed,
    entries,
    window,
    loading,
    error: error ?? reviews.error,
    onReview,
    hasLens,
    retry: () => setAttempt((value) => value + 1),
  };
}
