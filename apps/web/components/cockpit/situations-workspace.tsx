"use client";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { MotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PageHeading } from "@/components/categories/page-heading";
import { PageShell } from "@/components/categories/page-shell";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { Card } from "@/components/ui/card";
import { useLens } from "@/hooks/use-lens";
import { EvidenceWorkspace } from "./evidence-workspace";
import { LensCanvas } from "./lens-canvas";
import { LensHeader } from "./lens-header";
import { SituationInput } from "./situation-input";
export function SituationsWorkspace({ chip, text }: { chip?: string; text?: string }) {
  const lens = useLens();
  const { setScreen, reviews } = useWorkspace();
  const { screen } = reviews;
  const [tab, setTab] = useState("evidence");
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [findingId, setFindingId] = useState<string | null>(null);
  const requested = useRef("");
  useEffect(() => {
    setScreen(lens.state.screen);
  }, [lens.state.screen, setScreen]);
  useEffect(() => {
    const key = JSON.stringify({ chip, text });
    if (requested.current === key) return;
    const firstRequest = requested.current === "";
    requested.current = key;
    const profile = CHIPS.find((item) => item.id === chip);
    const session = sessionStorage.getItem("medlyn-session") ?? undefined;
    if (text?.trim()) void lens.run(text, undefined, false, session);
    else if (profile && (!firstRequest || profile.id !== CHIPS[0].id))
      void lens.run(profile.text, profile.id, false, session);
  }, [chip, text, lens.run]);
  function openSource(id: string) {
    setSegmentId(id);
    setFindingId(null);
    setTab("evidence");
  }
  function openFinding(id: string) {
    setFindingId(id);
    setTab("evidence");
  }
  function run(value: string, chipId?: string) {
    setSegmentId(null);
    setFindingId(null);
    void lens.run(value, chipId);
  }
  return (
    <MotionConfig reducedMotion="user">
      <PageShell>
        <PageHeading
          title="Situations"
          description="Choose your clinical task. Read the relevant facts with their evidence attached."
        />
        <SituationInput recent={lens.recent} activeChip={lens.activeChip} onRun={run} />
        <LensHeader screen={screen} mock={lens.mock} loading={lens.loading} />
        <Card className="grid min-w-0 gap-8 rounded-none bg-transparent py-0 shadow-none ring-0 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <LensCanvas
            screen={screen}
            state={lens.state}
            loading={lens.loading}
            annotations={reviews.annotations}
            onSource={openSource}
            onFinding={openFinding}
            onRetry={lens.retry}
            onReview={reviews.onReview}
          />
          <EvidenceWorkspace
            lens={lens}
            reviews={reviews}
            tab={tab}
            onTab={setTab}
            segmentId={segmentId}
            findingId={findingId}
            onSource={openSource}
            onCompare={openFinding}
          />
        </Card>
      </PageShell>
    </MotionConfig>
  );
}
