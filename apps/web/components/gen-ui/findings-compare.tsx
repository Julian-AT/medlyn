"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { HighlightDifference } from "./highlight-difference";
import { SourceChip } from "./source-chip";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function FindingsCompare(props: ToolProps<UiToolOutputs["show_findings"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      layout="compare"
      title="Findings to clarify"
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
    >
      {output?.findings.length === 0 ? (
        <ToolEmpty
          title="No findings to compare"
          description="No adjudicated findings match this view. Try a different topic."
        />
      ) : null}
      {(props.expanded ? output?.findings : output?.findings.slice(0, 2))?.map((finding) => (
        <Card
          key={finding.id}
          size="sm"
          className="rounded-2xl border border-gray-alpha-150 bg-card p-4 shadow-none ring-0"
        >
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-semibold tracking-tight">{finding.title}</CardTitle>
            <CardDescription className="text-sm">{finding.explanation}</CardDescription>
            <CardContent className="flex flex-wrap gap-1.5 p-0">
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                {finding.type.replaceAll("_", " ")}
              </Badge>
              <Badge variant="secondary">{finding.severity}</Badge>
            </CardContent>
          </CardHeader>
          <CardContent className="grid gap-4 p-0 sm:grid-cols-2">
            {finding.passages.map((passage, index) => (
              <CardContent
                key={`${passage.segmentId}:${passage.start}`}
                className="flex flex-col gap-2 rounded-2xl bg-muted p-4"
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
