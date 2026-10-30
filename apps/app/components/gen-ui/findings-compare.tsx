"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { HighlightDifference } from "./highlight-difference";
import { useToolPreview } from "./hooks/use-tool-preview";
import { SourceChip } from "./source-chip";
import { ToolEmpty } from "./tool-empty";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function FindingsCompare(props: ToolProps<UiToolOutputs["show_findings"]>) {
  const { output } = props;
  const preview = useToolPreview(output?.findings.length ?? 0, props.expanded, 2);
  return (
    <ToolFrame
      {...props}
      layout="compare"
      action={preview.toggle}
      title="Findings to clarify"
      description={output ? `As of ${displayDates(output.asOf)}` : undefined}
    >
      {output?.findings.length === 0 ? (
        <ToolEmpty
          title="No findings to compare"
          description="No adjudicated findings match this view. Try a different topic."
        />
      ) : null}
      {output?.findings.slice(0, preview.limit)?.map((finding) => (
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
          <CardContent className="grid gap-4 p-0">
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
                <SourceChip segmentId={passage.segmentId} quote={passage.quote} />
              </CardContent>
            ))}
          </CardContent>
        </Card>
      ))}
    </ToolFrame>
  );
}
