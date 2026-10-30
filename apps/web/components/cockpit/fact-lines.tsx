"use client";
import type { Card as ClinicalCard } from "@medlyn/engine/contracts";
import { SourceChips } from "@/components/patient/source-chips";
import { usePatientFacts } from "@/components/patient/use-patient-facts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { groupEvidence } from "@/lib/group-evidence";
import { showClaim } from "@/lib/lens-state";

export function FactLines({
  lines,
  onSource,
}: {
  lines: ClinicalCard["lines"];
  onSource: (id: string) => void;
}) {
  const facts = usePatientFacts();
  const grouped = groupEvidence(
    lines.filter(showClaim),
    (line) => line,
    (line) => facts.get(line.factIds[0]),
  );
  return (
    <>
      {grouped.map(({ item: line, sources }) => (
        <Card
          key={line.id}
          size="sm"
          className="gap-2 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0"
          data-claim-id={line.id}
        >
          <CardContent className="px-0">
            <CardDescription className="text-sm leading-relaxed text-foreground tabular-nums">
              {line.text}
            </CardDescription>
            <CardContent className="mt-2 flex flex-wrap items-center gap-1.5 px-0">
              {line.assertion !== "present" && <Badge variant="secondary">{line.assertion}</Badge>}
              {line.temporalStatus !== "stated" && (
                <Badge variant="secondary">{line.temporalStatus.replaceAll("_", " ")}</Badge>
              )}
              <SourceChips
                sources={sources.flatMap((entry) =>
                  entry.segmentIds.map((segmentId) => ({
                    segmentId,
                    date: facts.get(entry.factIds[0])?.docDate,
                  })),
                )}
                onOpen={onSource}
              />
            </CardContent>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
