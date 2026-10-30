"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { HighlightDifference } from "./highlight-difference";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function FindingsCompare(props: ToolProps<UiToolOutputs["show_findings"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      artifact={props.toolCallId ? { kind: "findings", id: props.toolCallId } : undefined}
      title="Findings to clarify"
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
    >
      {output?.findings.length === 0 ? (
        <CardDescription>No adjudicated findings to display in this view.</CardDescription>
      ) : null}
      {(props.expanded ? output?.findings : output?.findings.slice(0, 2))?.map((finding) => (
        <Card
          key={finding.id}
          size="sm"
          className="rounded-xl border-0 bg-background/60 shadow-none ring-0"
        >
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-tight">{finding.title}</CardTitle>
            <CardDescription className="text-sm">{finding.explanation}</CardDescription>
            <CardContent className="flex flex-wrap gap-1.5 px-0">
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                {finding.type.replaceAll("_", " ")}
              </Badge>
              <Badge variant="secondary">{finding.severity}</Badge>
            </CardContent>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {finding.passages.map((passage, index) => (
              <CardContent
                key={`${passage.segmentId}:${passage.start}`}
                className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3"
              >
                <CardDescription className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  <HighlightDifference
                    text={passage.quote}
                    other={finding.passages[index === 0 ? 1 : 0]?.quote ?? ""}
                  />
                </CardDescription>
                <SourceChip
                  segmentId={passage.segmentId}
                  label={passage.documentId}
                  quote={passage.quote}
                />
              </CardContent>
            ))}
          </CardContent>
        </Card>
      ))}
    </ToolFrame>
  );
}
