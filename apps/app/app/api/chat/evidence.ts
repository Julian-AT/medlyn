import type { AgentEvidence } from "@medlyn/engine/agent/tools";
import { AbsenceResult } from "@medlyn/engine/contracts";
import type { ToolSet } from "ai";
import { type patientEvidence, titleOutput } from "@/lib/patient-evidence";

/** Only evidence actually returned by a UI tool is eligible for a composed answer. */
export function trackUiEvidence(
  tools: ToolSet,
  evidence: AgentEvidence,
  chip: { id: string; text: string } | undefined,
  sources: Awaited<ReturnType<typeof patientEvidence>>,
) {
  const collect = async (output: unknown) => {
    const ids = new Set<string>();
    const visit = (value: unknown): void => {
      if (typeof value === "string") ids.add(value);
      else if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") Object.values(value).forEach(visit);
    };
    visit(output);
    const absence = AbsenceResult.safeParse(output);
    if (absence.success) evidence.absences.push(absence.data);
    const { facts, segments } = sources;
    for (const fact of facts) {
      if (ids.has(fact.id) && fact.locationOk && fact.support === "supported") {
        evidence.facts.set(fact.id, fact);
        ids.add(fact.segmentId);
      }
    }
    for (const segment of segments)
      if (ids.has(segment.id)) evidence.segments.set(segment.id, segment);
  };
  return Object.fromEntries(
    Object.entries(tools).map(([name, definition]) => {
      const execute = definition.execute;
      return [
        name,
        !execute
          ? definition
          : {
              ...definition,
              execute: async (
                input: unknown,
                options: Parameters<NonNullable<typeof execute>>[1],
              ) => {
                const selectedInput =
                  name === "open_lens" && chip ? { text: chip.text, chipId: chip.id } : input;
                const output = await titleOutput(await execute(selectedInput, options), sources);
                await collect(output);
                return output;
              },
            },
      ];
    }),
  ) as ToolSet;
}
