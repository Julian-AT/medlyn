"use client";

import { Screen } from "@medlyn/engine/contracts";
import { useEffect } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { useWorkspace } from "@/components/shell/workspace-provider";

export function useEvidence(lensKey?: string) {
  const { patient } = useActivePatient();
  const { sessionId, reviews, setScreen } = useWorkspace();
  const screen = reviews.machineScreen;
  useEffect(() => {
    if (
      !sessionId ||
      (screen?.patient.id === patient.id && (!lensKey || screen.lensKey === lensKey))
    )
      return;
    try {
      const saved = sessionStorage.getItem(`medlyn:last-lens:${patient.id}:${sessionId}`);
      const parsed = saved ? Screen.safeParse(JSON.parse(saved)) : null;
      if (
        parsed?.success &&
        parsed.data.patient.id === patient.id &&
        (!lensKey || parsed.data.lensKey === lensKey)
      )
        setScreen(parsed.data);
    } catch (error) {
      console.warn("recent_lens_unavailable", error instanceof Error ? error.name : "Unknown");
    }
  }, [sessionId, screen, patient.id, lensKey, setScreen]);
  return screen?.patient.id === patient.id && (!lensKey || screen.lensKey === lensKey)
    ? screen
    : null;
}
