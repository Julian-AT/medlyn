"use client";

import type { ToolUIPart } from "ai";
import { CardContent, CardDescription } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { GalleryResult, GalleryState } from "./gallery-tools";
import { renderToolPart, type UiToolName } from "./registry";
import { ToolFrame } from "./tool-frame";

type State = GalleryState | "output-error";

export function GalleryStateView({
  name,
  input,
  state,
  result,
  expanded,
}: {
  name: UiToolName;
  input: Record<string, unknown>;
  state: State;
  result?: GalleryResult;
  expanded: boolean;
}) {
  const base = { type: `tool-${name}` as const, toolCallId: `gallery-${name}`, input };
  const part: ToolUIPart =
    state === "output-error"
      ? { ...base, state, errorText: "Simulated view error" }
      : state === "input-streaming"
        ? { ...base, state }
        : state === "input-available"
          ? { ...base, state }
          : (result?.part ?? { ...base, state: "input-available" });
  return (
    <CardContent className="flex min-w-0 flex-col gap-3 p-0">
      <CardDescription className="text-xs font-medium">{state}</CardDescription>
      {state === "output-available" && !result ? (
        <ToolFrame state="output-available" output={{}} title="Patient output" expanded={expanded}>
          <Empty className="min-h-40 rounded-2xl p-4">
            <EmptyHeader>
              <EmptyTitle className="text-sm">Load live patient data</EmptyTitle>
              <EmptyDescription>
                Use “Load patient views” to inspect this tool's validated output.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </ToolFrame>
      ) : (
        renderToolPart(part, expanded)
      )}
    </CardContent>
  );
}
