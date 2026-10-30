"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Badge } from "@/components/ui/badge";
import { CardContent, CardDescription } from "@/components/ui/card";
import { ClaimLine } from "./claim-line";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function Timeline(props: ToolProps<UiToolOutputs["show_timeline"]>) {
  const { output } = props;
  return (
    <ToolFrame
      {...props}
      title="Timeline"
      description={output ? `As of ${output.asOf}` : undefined}
      action={
        output && (
          <Badge variant="secondary" className="font-mono">
            {output.events.length} entries
          </Badge>
        )
      }
    >
      {output?.events.length === 0 ? (
        <CardDescription>No events to display in this view.</CardDescription>
      ) : null}
      {output?.events.map((event) => (
        <CardContent
          key={event.factId}
          className="relative flex flex-col gap-3 border-l border-primary/25 py-2 pl-5 pr-0"
        >
          <Badge
            aria-hidden="true"
            className="absolute -left-1 top-3 size-2 rounded-full border-0 bg-primary p-0"
          />
          <CardContent className="flex flex-wrap items-center gap-2 px-0">
            <CardDescription className="font-mono text-xs font-medium tabular-nums">
              {event.date}
            </CardDescription>
            <Badge variant="outline" className="text-xs font-normal">
              {event.kind.replaceAll("_", " ")}
            </Badge>
          </CardContent>
          <ClaimLine {...event} />
        </CardContent>
      ))}
    </ToolFrame>
  );
}
