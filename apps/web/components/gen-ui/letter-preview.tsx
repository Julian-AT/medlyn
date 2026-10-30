"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function LetterPreview(props: ToolProps<UiToolOutputs["draft_letter"]>) {
  const { output } = props;
  const query = new URLSearchParams({
    sessionId: output?.sessionId ?? "",
    letterId: output?.id ?? "",
  });
  return (
    <ToolFrame
      {...props}
      title="GP follow-up letter"
      description={output ? `Draft · as of ${output.asOf}` : undefined}
    >
      {output?.sections
        .filter((section) => section.claims.length > 0)
        .map((section) => (
          <CardContent key={section.id} className="flex flex-col gap-2 px-0">
            <CardTitle className="text-xs font-medium">{section.title}</CardTitle>
            {section.claims
              .filter((claim) => ["supported", "exempt"].includes(claim.validation.support))
              .map((claim) => (
                <CardContent key={claim.id} className="flex flex-col gap-1 px-0">
                  <CardDescription className="whitespace-pre-wrap text-sm text-foreground">
                    {claim.text}
                  </CardDescription>
                  {claim.flag ? (
                    <Badge variant="outline">
                      Needs review · {claim.flag.reason.replaceAll("_", " ")}
                    </Badge>
                  ) : null}
                  {claim.segmentIds.map((segmentId) => (
                    <SourceChip key={segmentId} segmentId={segmentId} />
                  ))}
                </CardContent>
              ))}
          </CardContent>
        ))}
      {output?.annotations.length ? (
        <CardContent className="flex flex-col gap-2 border-t px-0 pt-3">
          <CardTitle className="text-xs">Clinician notes — not from the source documents</CardTitle>
          {output.annotations.map((note) => (
            <CardDescription key={note.id} className="whitespace-pre-wrap text-xs">
              {note.text}
            </CardDescription>
          ))}
        </CardContent>
      ) : null}
      <Button asChild variant="outline" size="sm" className="shadow-none">
        <a href={`/letter?${query}`}>Open GP letter</a>
      </Button>
    </ToolFrame>
  );
}
