"use client";

import type { ClaimLine as ClaimLineType } from "@medlyn/engine/contracts";
import { SourceChips } from "@/components/patient/source-chips";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { displayDates } from "./display-dates";

export function ClaimLine({
  line,
  quote,
  sources,
}: {
  line: ClaimLineType;
  quote?: string;
  sources?: { segmentId: string; quote?: string; date?: string }[];
}) {
  if (line.validation.support !== "supported" && line.validation.support !== "exempt") return null;
  return (
    <CardContent data-claim-id={line.id} className="flex flex-col gap-1.5 px-0 py-0">
      <CardDescription className="whitespace-pre-wrap text-sm text-foreground tabular-nums">
        {displayDates(line.text)}
      </CardDescription>
      <CardContent className="flex flex-wrap items-center gap-1.5 px-0 py-0">
        {line.assertion !== "present" ? <Badge variant="outline">{line.assertion}</Badge> : null}
        {line.temporalStatus !== "stated" ? (
          <Badge variant="outline">{line.temporalStatus.replaceAll("_", " ")}</Badge>
        ) : null}
        <SourceChips
          sources={sources ?? line.segmentIds.map((segmentId) => ({ segmentId, quote }))}
        />
      </CardContent>
    </CardContent>
  );
}
