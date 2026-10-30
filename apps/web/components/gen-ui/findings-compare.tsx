"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HighlightDifference } from "./highlight-difference";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function FindingsCompare(props: ToolProps<UiToolOutputs["show_findings"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      title="Findings to clarify"
      description={output ? `As of ${output.asOf}` : undefined}
    >
      {output?.findings.length === 0 ? (
        <CardDescription>No adjudicated findings to display in this view.</CardDescription>
      ) : null}
      {output?.findings.map((finding) => (
        <Card key={finding.id} size="sm" className="rounded-lg border shadow-none ring-0">
          <CardHeader>
            <CardTitle className="text-sm">{finding.title}</CardTitle>
            <CardDescription className="text-sm">{finding.explanation}</CardDescription>
            <CardContent className="flex flex-wrap gap-1.5 px-0">
              <Badge variant="outline">{finding.type.replaceAll("_", " ")}</Badge>
              <Badge variant="secondary">{finding.severity}</Badge>
            </CardContent>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {finding.passages.map((passage, index) => (
              <CardContent
                key={`${passage.segmentId}:${passage.start}`}
                className="space-y-2 rounded-md border p-3"
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
