import type { Card as ClinicalCard } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { showClaim } from "@/lib/lens-state";
import { SourceChip } from "./source-chip";

export function FactLines({
  lines,
  onSource,
}: {
  lines: ClinicalCard["lines"];
  onSource: (id: string) => void;
}) {
  return (
    <>
      {lines.filter(showClaim).map((line) => (
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
              {line.segmentIds.map((id, index) => (
                <SourceChip key={id} segmentId={id} index={index + 1} onOpen={onSource} />
              ))}
            </CardContent>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
