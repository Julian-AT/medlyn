import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { type Fact, MedicationAttrs } from "@medlyn/engine/contracts";
import { medicationIdentity, medicationListLabel, medicationRegimenKey } from "./medication-format";

type SourceList = UiToolOutputs["show_medications"]["lists"][number];
type Evidence = SourceList["lines"][number];

export type MedicationEntry = {
  id: string;
  attrs: MedicationAttrs;
  evidence: Evidence;
  sources: Evidence[];
  critical: boolean;
};

export type MedicationSourceList = Omit<SourceList, "lines"> & {
  id: string;
  entries: MedicationEntry[];
};

/** Project only checked template rows; every displayed field retains its evidence identity. */
export function medicationSourceLists(
  lists: SourceList[],
  facts: ReadonlyMap<string, Fact>,
): MedicationSourceList[] {
  return lists
    .map((list) => {
      const groups = new Map<string, MedicationEntry>();
      for (const evidence of list.lines) {
        const fact = facts.get(evidence.factId);
        const { line } = evidence;
        if (
          fact?.kind !== "medication" ||
          !fact.locationOk ||
          fact.documentId !== list.documentId ||
          evidence.documentId !== fact.documentId ||
          evidence.segmentId !== fact.segmentId ||
          line.kind !== "template" ||
          !["supported", "exempt"].includes(line.validation.support) ||
          !line.factIds.includes(fact.id) ||
          !line.segmentIds.includes(fact.segmentId)
        )
          continue;
        const parsed = MedicationAttrs.safeParse(fact.attrs);
        if (!parsed.success) continue;
        const attrs = parsed.data;
        const key = JSON.stringify([
          medicationIdentity(attrs.generic),
          medicationRegimenKey(attrs),
          line.assertion,
          line.temporalStatus,
        ]);
        const existing = groups.get(key);
        if (existing) {
          if (!existing.sources.some((source) => source.segmentId === evidence.segmentId)) {
            existing.sources.push(evidence);
          }
          continue;
        }
        groups.set(key, {
          id: fact.id,
          attrs,
          evidence,
          sources: [evidence],
          critical:
            /^B01/i.test(attrs.atc ?? "") ||
            /^(?:acetylsalicylic acid|aspirin)$/i.test(attrs.generic.trim()),
        });
      }
      return {
        ...list,
        id: `${list.documentId}:${list.listLabel}`,
        listLabel: medicationListLabel(list.listLabel),
        entries: [...groups.values()].sort((a, b) =>
          a.attrs.generic.localeCompare(b.attrs.generic),
        ),
      };
    })
    .filter((list) => list.entries.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
