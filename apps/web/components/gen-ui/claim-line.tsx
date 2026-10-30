"use client";

import type { ClaimLine as ClaimLineType } from "@medlyn/engine/contracts";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { SourceChip } from "./source-chip";

export function ClaimLine({ line, quote }: { line: ClaimLineType; quote?: string }) {
  if (line.validation.support !== "supported" && line.validation.support !== "exempt") return null;
  return (
    <CardContent data-claim-id={line.id} className="flex flex-col gap-1.5 px-0 py-0">
      <CardDescription className="whitespace-pre-wrap text-sm text-foreground tabular-nums">
        {line.text}
      </CardDescription>
      <CardContent className="flex flex-wrap items-center gap-1.5 px-0 py-0">
        {line.assertion !== "present" ? <Badge variant="outline">{line.assertion}</Badge> : null}
        {line.temporalStatus !== "stated" ? (
          <Badge variant="outline">{line.temporalStatus.replaceAll("_", " ")}</Badge>
        ) : null}
        {line.segmentIds.map((segmentId) => (
          <SourceChip key={segmentId} segmentId={segmentId} quote={quote} />
        ))}
      </CardContent>
    </CardContent>
  );
}
