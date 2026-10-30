"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { useLens } from "@/hooks/use-lens";
import { useReviews } from "@/hooks/use-reviews";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LensCanvas } from "./LensCanvas";
import { LensHeader } from "./LensHeader";
import { EvidenceWorkspace } from "./EvidenceWorkspace";

export function Cockpit() {
  const lens = useLens();
  const reviews = useReviews(lens.state.screen, lens.sessionId);
  const { screen } = reviews;
  const [tab, setTab] = useState("evidence");
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [findingId, setFindingId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(localStorage.getItem("medlyn-theme") === "light" ? "light" : "dark");
    function source(event: Event) {
      const detail = (event as CustomEvent<{ segmentId?: string }>).detail;
      if (detail?.segmentId) openSource(detail.segmentId);
    }
    const letter = () => setTab("letter");
    window.addEventListener("medlyn:show-source", source);
    window.addEventListener("medlyn:add-to-letter", letter);
    return () => {
      window.removeEventListener("medlyn:show-source", source);
      window.removeEventListener("medlyn:add-to-letter", letter);
    };
  }, []);
  function openSource(id: string) {
    setSegmentId(id);
    setFindingId(null);
    setTab("evidence");
  }
  function openFinding(id: string) {
    setFindingId(id);
    setTab("evidence");
  }
  function run(text: string, chipId?: string) {
    setSegmentId(null);
    setFindingId(null);
    void lens.run(text, chipId);
  }
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("medlyn-theme", next);
  }
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar
            screen={screen}
            activeChip={lens.activeChip}
            theme={theme}
            reviewCount={reviews.count}
            onSituation={run}
            onSource={openSource}
            onTheme={toggleTheme}
            onReset={reviews.reset}
          />
          <SidebarInset className="min-w-0">
            <SiteHeader situation={screen?.situation} recent={lens.recent} onRun={run} />
            <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
              <LensHeader screen={screen} mock={lens.mock} loading={lens.loading} />
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
        <Toaster theme={theme} richColors />
      </TooltipProvider>
    </MotionConfig>
  );
}
