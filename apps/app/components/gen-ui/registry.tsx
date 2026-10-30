"use client";

import type { UiToolOutputs, uiTools } from "@medlyn/engine/agent/ui-tools";
import type { InferUITools, ToolUIPart } from "ai";
import type { ReactNode } from "react";
import { FindingsCompare } from "./findings-compare";
import { GapCard } from "./gap-card";
import { LabTrend } from "./lab-trend";
import { LensCards } from "./lens-cards";
import { LetterPreview } from "./letter-preview";
import { MedicationTable } from "./medication-table";
import { PassageCard } from "./passage-card";
import { PatientSummary } from "./patient-summary";
import { Timeline } from "./timeline";

export type UiToolPart = ToolUIPart<InferUITools<ReturnType<typeof uiTools>>>;
export type UiToolName = keyof UiToolOutputs;

export function renderToolPart(part: UiToolPart | ToolUIPart, expanded = false): ReactNode {
  // The server validates each output against the tool's schema before streaming it.
  const typed = part as UiToolPart;
  switch (typed.type) {
    case "tool-open_lens":
      return <LensCards {...typed} expanded={expanded} />;
    case "tool-show_patient_summary":
      return <PatientSummary {...typed} expanded={expanded} />;
    case "tool-show_medications":
      return <MedicationTable {...typed} expanded={expanded} />;
    case "tool-show_lab_trend":
      return <LabTrend {...typed} expanded={expanded} />;
    case "tool-show_timeline":
      return <Timeline {...typed} expanded={expanded} />;
    case "tool-show_findings":
      return <FindingsCompare {...typed} expanded={expanded} />;
    case "tool-show_passage":
      return <PassageCard {...typed} expanded={expanded} />;
    case "tool-check_documented":
      return <GapCard {...typed} expanded={expanded} />;
    case "tool-draft_letter":
      return <LetterPreview {...typed} expanded={expanded} />;
    default:
      return null;
  }
}
