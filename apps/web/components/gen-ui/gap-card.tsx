"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

type Props = ToolProps<UiToolOutputs["check_documented"], { concept?: string }>;

export function GapCard(props: Props) {
  const { output } = props;
  const eligible = output?.searched.eligible ?? 0;
  const complete = eligible > 0 && (output?.searched.total ?? 0) >= eligible;
  const unavailable =
    output?.status === "unavailable" ||
    (output?.status === "not_documented" && (!complete || output.segmentIds.length > 0));
  const retry = () =>
    window.dispatchEvent(
      new CustomEvent("medlyn:retry-tool", {
        detail: {
          toolName: "check_documented",
          input: { concept: output?.concept || props.input?.concept },
        },
      }),
    );
  return (
    <ToolFrame {...props} title={output?.concept || props.input?.concept || "Documentation check"}>
      <CardDescription className="text-sm text-foreground tabular-nums">
        {unavailable
          ? "Couldn't check"
          : output?.status === "not_documented"
            ? `Not documented as of ${displayDates(output.searched.asOf)} · searched ${eligible} of ${eligible} eligible documents`
            : "Documented in the source passages"}
      </CardDescription>
      <CardContent className="flex flex-wrap gap-1.5 px-0">
        {output?.segmentIds.map((segmentId) => (
          <SourceChip key={segmentId} segmentId={segmentId} />
        ))}
      </CardContent>
      {unavailable ? (
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          Retry check
        </Button>
      ) : null}
    </ToolFrame>
  );
}
