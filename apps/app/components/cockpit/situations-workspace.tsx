"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { useLens } from "@/hooks/use-lens";
import { EvidenceWorkspace } from "./evidence-workspace";
import { FindingDialog } from "./finding-dialog";
import { LensHeader } from "./lens-header";
import { SituationInput } from "./situation-input";

export function SituationsWorkspace({ chip, text }: { chip?: string; text?: string }) {
  const { patient } = useActivePatient();
  const lens = useLens({ chipId: chip, text });
  const { setScreen, reviews } = useWorkspace();
  const [tab, setTab] = useState("facts");
  const [findingId, setFindingId] = useState<string | null>(null);
  const screen = reviews.screen?.lensKey === lens.state.screen?.lensKey ? reviews.screen : null;
  useEffect(() => {
    setScreen(lens.state.screen);
  }, [lens.state.screen, setScreen]);
  useEffect(() => {
    if (!lens.sessionId || lens.loading || !lens.state.complete || !lens.state.screen) return;
    try {
      sessionStorage.setItem(
        `medlyn:last-lens:${patient.id}:${lens.sessionId}`,
        JSON.stringify(lens.state.screen),
      );
    } catch (error) {
      console.warn("recent_lens_unavailable", error instanceof Error ? error.name : "Unknown");
    }
  }, [lens.sessionId, lens.loading, lens.state.complete, lens.state.screen, patient.id]);
  function run(value: string, chipId?: string) {
    setFindingId(null);
    setTab("facts");
    void lens.run(value, chipId);
  }
  return (
    <PageShell>
      <PageHeading
        category="situations"
        title="Situations"
        description="Your task, the relevant facts, and the sources behind them."
      />
      <SituationInput recent={lens.recent} activeChip={lens.activeChip} onRun={run} />
      <LensHeader
        screen={screen}
        mock={lens.mock}
        loading={lens.loading}
        error={lens.state.error}
      />
      <EvidenceWorkspace
        lens={lens}
        reviews={reviews}
        screen={screen}
        tab={tab}
        onTab={setTab}
        onCompare={setFindingId}
      />
      <FindingDialog
        finding={screen?.findings.find((finding) => finding.id === findingId) ?? null}
        onClose={() => setFindingId(null)}
        onReview={reviews.onReview}
      />
    </PageShell>
  );
}
