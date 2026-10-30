"use client";

import { makeAssistantTool, makeAssistantToolUI } from "@assistant-ui/react";
import { AgentTools } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { SourceChip, showSource } from "./SourceChip.tsx";
import { ToolStep } from "./ToolStep.tsx";

const toolUIs = [
  "search_facts",
  "get_passage",
  "check_documented",
  "list_findings",
  "timeline",
  "calculate",
].map((toolName) => makeAssistantToolUI({ toolName, render: ToolStep }));

const ShowSource = makeAssistantTool({
  toolName: "show_source",
  type: "frontend",
  description: "Open an evidence passage",
  parameters: AgentTools.show_source.input,
  execute: async ({ segmentId }: { segmentId: string }) => {
    showSource(segmentId);
    return { ok: true };
  },
  render: ({ args }) => (args.segmentId ? <SourceChip segmentId={args.segmentId} /> : null),
});

const AddToLetter = makeAssistantTool({
  toolName: "add_to_letter",
  type: "frontend",
  description: "Propose validated claims for the GP letter",
  parameters: AgentTools.add_to_letter.input,
  execute: async ({ claimIds }: { claimIds: string[] }) => {
    window.dispatchEvent(new CustomEvent("medlyn:add-to-letter", { detail: { claimIds } }));
    return { ok: true };
  },
  render: () => <Badge variant="secondary">Proposed for the GP letter</Badge>,
});

export function ToolSteps() {
  return (
    <>
      {toolUIs.map((ToolUI, index) => (
        <ToolUI key={index} />
      ))}
      <ShowSource />
      <AddToLetter />
    </>
  );
}
