"use client";

import type { ReactNode } from "react";
import { ArtifactOpenButton } from "@/components/artifacts/artifact-open-button";
import type { Artifact } from "@/components/artifacts/artifact-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const status = failed ? "Couldn't load" : ready ? "Ready" : "Loading";
  return (
    <Card
      size="sm"
      data-tool-state={state}
      className="w-full min-w-0 gap-4 rounded-2xl border border-border bg-card shadow-none ring-0 [overflow-anchor:none] [--card-spacing:--spacing(4)] [&_[data-slot=button]]:rounded-control [&_[data-slot=button][data-size=sm]]:min-h-8 [&_[data-slot=button]_svg]:size-4"
    >
      <CardHeader className="grid h-16 grid-cols-[minmax(0,1fr)_auto] grid-rows-2 items-center gap-x-3 gap-y-1">
        <CardTitle className="truncate text-sm font-semibold" title={displayDates(title)}>
          {displayDates(title)}
        </CardTitle>
        <Badge variant={failed ? "destructive" : "secondary"} className="row-span-2 text-xs">
          {status}
        </Badge>
        <CardDescription
          className="col-start-1 line-clamp-2 text-xs"
          title={description ? displayDates(description) : undefined}
        >
          {description ? displayDates(description) : "Source-linked patient view"}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <ScrollArea
          type="always"
          className={expanded ? "h-[32rem] w-full" : "h-80 w-full"}
          aria-label={`${title} content`}
        >
          <CardContent className="flex min-w-0 flex-col gap-4 p-0 pr-3 text-sm">
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
                title={title}
                layout={layout}
                pendingInput={state === "input-streaming"}
              />
            )}
          </CardContent>
        </ScrollArea>
      </CardContent>
      <CardContent className="flex h-8 min-w-0 items-center justify-between gap-2">
        {ready && action ? action : <CardDescription className="text-xs">{status}</CardDescription>}
        {artifact && !expanded && ready ? <ArtifactOpenButton artifact={artifact} /> : null}
      </CardContent>
    </Card>
  );
}
