"use client";

import type { ClaimLine as Line } from "@medlyn/engine/contracts";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { CardContent } from "@/components/ui/card";
import { groupEvidence } from "@/lib/group-evidence";
import { ClaimLine } from "./claim-line";

type Item = { line: Line; quote?: string };

export function ClaimList({ items }: { items: Item[] }) {
  const facts = usePatientFacts();
  const factOf = (item: Item) => facts.get(item.line.factIds[0]);
  return (
    <CardContent role="list" className="flex flex-col gap-4 p-0">
      {groupEvidence(items, (item) => item.line, factOf).map(({ item, sources }) => (
        <CardContent key={item.line.id} role="listitem" className="px-0">
          <ClaimLine
            {...item}
            sources={sources.flatMap((entry) =>
              entry.line.segmentIds.map((segmentId) => ({
                segmentId,
                quote: entry.quote,
                date: factOf(entry)?.docDate,
              })),
            )}
          />
        </CardContent>
      ))}
    </CardContent>
  );
}
