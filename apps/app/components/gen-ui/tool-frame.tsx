"use client";

import {
  Alert02Icon,
  ChartLineData01Icon,
  File02Icon,
  Medicine01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { ArtifactOpenButton } from "@/components/artifacts/artifact-open-button";
import type { Artifact } from "@/components/artifacts/artifact-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDates } from "./display-dates";
import { ToolSkeleton, type ToolSkeletonLayout } from "./tool-skeleton";

export type ToolProps<Output, Input = unknown> = {
  state: string;
  toolCallId?: string;
  expanded?: boolean;
  input?: Input;
  output?: Output;
  errorText?: string;
};

type Props = ToolProps<unknown> & {
  title: string;
  description?: string;
  action?: ReactNode;
  artifact?: Artifact;
  layout?: ToolSkeletonLayout;
  children: ReactNode;
};

export function ToolFrame({
  state,
  output,
  title,
  description,
  action,
  artifact,
  expanded,
  layout = "list",
  children,
}: Props) {
  const failed = state === "output-error" || state === "output-denied";
  const ready = state === "output-available" && output != null;
  const icon =
    layout === "chart"
      ? ChartLineData01Icon
      : layout === "table"
        ? Medicine01Icon
        : layout === "compare"
          ? Alert02Icon
          : File02Icon;
  const heading = displayDates(title.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase()));
  const hasFooter = ready && (action || (artifact && !expanded));
  return (
    <Card
      size="sm"
      data-tool-state={state}
      className="w-full min-w-0 gap-4 rounded-2xl border border-border bg-card p-4 shadow-none ring-0 [overflow-anchor:none]"
    >
      <CardHeader className="flex flex-row items-start gap-2 p-0">
        <HugeiconsIcon
          icon={icon}
          size={16}
          strokeWidth={2}
          className="mt-0.5 shrink-0"
          aria-hidden="true"
        />
        <CardContent className="flex min-w-0 flex-1 flex-col gap-1 p-0">
          <CardTitle className="text-sm font-semibold">{heading}</CardTitle>
          {description ? (
            <CardDescription className="text-xs">{displayDates(description)}</CardDescription>
          ) : null}
        </CardContent>
        {!ready && (
          <Badge variant={failed ? "destructive" : "secondary"} className="shrink-0 text-xs">
            {failed ? "Couldn't load" : "Loading"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4 p-0 text-sm">
        {failed ? (
          <Alert variant="destructive" className="rounded-control border shadow-none">
            <AlertTitle>
              {state === "output-denied" ? "View not authorised" : "Couldn't load this view"}
            </AlertTitle>
            <AlertDescription>
              {state === "output-denied"
                ? "This action was not approved. Choose another patient view to continue."
                : "Ask Medlyn to try this view again. No result has been established."}
            </AlertDescription>
          </Alert>
        ) : ready ? (
          children
        ) : (
          <ToolSkeleton
            title={heading}
            layout={layout}
            pendingInput={state === "input-streaming"}
          />
        )}
      </CardContent>
      {hasFooter ? (
        <CardContent className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-0">
          {action}
          {artifact && !expanded ? <ArtifactOpenButton artifact={artifact} /> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
