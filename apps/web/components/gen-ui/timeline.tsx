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
    >
      {output?.events.length === 0 ? (
        <CardDescription>No events to display in this view.</CardDescription>
      ) : null}
      {output?.events.map((event) => (
        <CardContent key={event.factId} className="space-y-2 border-l pl-4 pr-0 py-1">
          <CardContent className="flex flex-wrap items-center gap-2 px-0">
            <CardDescription className="text-xs tabular-nums">{event.date}</CardDescription>
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
