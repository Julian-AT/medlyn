"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { SourceChips } from "./evidence-sources";
import { useToolPreview } from "./hooks/use-tool-preview";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function LetterPreview(props: ToolProps<UiToolOutputs["draft_letter"]>) {
  const { output } = props;
  const claims =
    output?.sections.flatMap((section) =>
      section.claims
        .filter((claim) => ["supported", "exempt"].includes(claim.validation.support))
        .map((claim) => ({ claim, section })),
    ) ?? [];
  const preview = useToolPreview(claims.length, props.expanded, 4);
  const visible = claims.slice(0, preview.limit);
  const query = new URLSearchParams({
    sessionId: output?.sessionId ?? "",
    letterId: output?.id ?? "",
  });
  return (
    <ToolFrame
      {...props}
      artifact={props.toolCallId ? { kind: "letter", id: props.toolCallId } : undefined}
      title="GP follow-up letter"
      description={output ? `Draft · as of ${displayDates(output.asOf)}` : undefined}
      action={preview.toggle}
    >
      {output && !claims.length ? (
        <ToolEmpty
          title="No validated letter text to display"
          description="Review the source evidence, then ask Medlyn to draft the letter again."
        />
      ) : null}
      {visible.map(({ claim, section }, index) => (
        <CardContent key={claim.id} className="flex flex-col gap-2 p-0">
          {section.id !== "header" && section.id !== visible[index - 1]?.section.id ? (
            <CardTitle className="text-xs font-medium">{section.title}</CardTitle>
          ) : null}
          <CardDescription className="whitespace-pre-wrap text-sm text-foreground">
            {displayDates(claim.text)}
          </CardDescription>
          {claim.flag ? (
            <Badge
              variant="outline"
              className="border-warning/30 bg-warning/10 text-xs text-warning"
            >
              Needs review · {claim.flag.reason.replaceAll("_", " ")}
            </Badge>
          ) : null}
          <SourceChips sources={claim.segmentIds.map((segmentId) => ({ segmentId }))} />
        </CardContent>
      ))}
      {props.expanded && output?.annotations.length ? (
        <CardContent className="flex flex-col gap-2 p-0 pt-3">
          <CardTitle className="text-xs">Clinician notes — not from the source documents</CardTitle>
          {output.annotations.map((note) => (
            <CardDescription key={note.id} className="whitespace-pre-wrap text-xs">
              {note.text}
            </CardDescription>
          ))}
        </CardContent>
      ) : null}
      {props.expanded && (
        <Button asChild variant="outline" size="sm" className="rounded-control shadow-none">
          <a href={`/letter?${query}`}>Open GP letter</a>
        </Button>
      )}
    </ToolFrame>
  );
}
