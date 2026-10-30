import type { EvidenceWindow } from "@medlyn/engine/contracts";
import { AgentTools, FactKind } from "@medlyn/engine/contracts";
import { tool } from "ai";
import { z } from "zod";
import { createPatientAgentTools } from "./patient-agent-tools";

export function evidenceTools(window: EvidenceWindow, patientId: string) {
  const { implementations: execute, evidence } = createPatientAgentTools(window, patientId);
  const tools = {
    search_facts: tool({
      description: "Search facts within this evidence window",
      inputSchema: z.object({ query: z.string(), kinds: z.array(FactKind).nullable() }),
      execute: ({ query, kinds }) => execute.search_facts({ query, kinds: kinds ?? undefined }),
    }),
    get_passage: tool({
      description: "Read an eligible source and neighboring passages",
      inputSchema: AgentTools.get_passage.input,
      execute: execute.get_passage,
    }),
    check_documented: tool({
      description:
        "Full absence check across every eligible document; mandatory before any absence answer",
      inputSchema: AgentTools.check_documented.input,
      execute: execute.check_documented,
    }),
    list_findings: tool({
      description: "Read adjudicated findings",
      inputSchema: z.object({ topic: z.string().nullable() }),
      execute: ({ topic }) => execute.list_findings({ topic: topic ?? undefined }),
    }),
    timeline: tool({
      description: "Sort facts by event date for an entity, kind or label",
      inputSchema: AgentTools.timeline.input,
      execute: execute.timeline,
    }),
    calculate: tool({
      description: "Safe arithmetic; every number must occur in the supplied cited facts",
      inputSchema: AgentTools.calculate.input,
      execute: execute.calculate,
    }),
    show_source: tool({
      description: "Client: open a source already returned by an evidence tool",
      inputSchema: AgentTools.show_source.input,
    }),
    add_to_letter: tool({
      description: "Client: propose previously validated claim ids for the GP letter",
      inputSchema: AgentTools.add_to_letter.input,
    }),
  };
  return { tools, evidence };
}
