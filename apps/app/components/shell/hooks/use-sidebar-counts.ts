"use client";

import type { EvidenceWindow, Fact, Finding } from "@medlyn/engine/contracts";
import { useEffect, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { sidebarCounts } from "../sidebar-counts";

export function useSidebarCounts() {
  const { patient } = useActivePatient();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [findings, setFindings] = useState<Finding[]>([]);

  useEffect(() => {
    setCounts({});
    setFindings([]);
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/patient/facts?patientId=${patient.id}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Patient counts unavailable");
        const data: { facts: Fact[]; window: EvidenceWindow } = await response.json();
        setCounts(sidebarCounts(data.facts, data.window.eligibleDocumentIds.length));
        const result = await fetch(
          `/api/patient/findings?patientId=${patient.id}&asOf=${encodeURIComponent(data.window.asOf)}`,
          { signal: controller.signal },
        );
        if (!result.ok) throw new Error("Finding counts unavailable");
        const body: { findings: Finding[]; window: EvidenceWindow } = await result.json();
        if (
          body.window.corpusRevision !== data.window.corpusRevision ||
          body.window.asOf !== data.window.asOf ||
          JSON.stringify(body.window.eligibleDocumentIds) !==
            JSON.stringify(data.window.eligibleDocumentIds)
        )
          throw new Error("Evidence window changed");
        setFindings(body.findings);
      } catch (error) {
        if (!controller.signal.aborted)
          console.warn(
            "sidebar_counts_unavailable",
            error instanceof Error ? error.name : "Unknown",
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [patient.id]);

  return { counts, findings };
}
