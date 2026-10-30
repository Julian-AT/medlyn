import type { Card as ClinicalCard } from "@medlyn/engine/contracts";
import { showClaim } from "@/lib/lens-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SourceChip } from "./SourceChip";

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
            <p className="text-sm leading-relaxed">{numericText(line.text)}</p>
            <p className="mt-2 flex flex-wrap items-center gap-1.5">
              {line.assertion !== "present" && <Badge variant="secondary">{line.assertion}</Badge>}
              {line.temporalStatus !== "stated" && (
                <Badge variant="secondary">{line.temporalStatus.replaceAll("_", " ")}</Badge>
              )}
              {line.segmentIds.map((id, index) => (
                <SourceChip key={id} segmentId={id} index={index + 1} onOpen={onSource} />
              ))}
            </p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
function numericText(text: string) {
  return text
    .split(/((?<![\p{L}])\d+(?:[.,]\d+)?(?:[/-](?:\d+|½))*(?:\s*(?:mg|kg|cm|mm|µg|mcg|%|mL))?)/gu)
    .map((part, index) =>
      index % 2 === 1 ? (
        <span className="whitespace-nowrap font-mono tabular-nums" key={index}>
          {part}
        </span>
      ) : (
        part
      ),
    );
}
