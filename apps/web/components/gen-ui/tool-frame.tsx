"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { ArtifactOpenButton } from "@/components/artifacts/artifact-open-button";
import type { Artifact } from "@/components/artifacts/artifact-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { displayDates } from "./display-dates";

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
  children: ReactNode;
};

export function ToolFrame({
  state,
  output,
  errorText,
  title,
  description,
  action,
  artifact,
  expanded,
  children,
}: Props) {
  if (state === "output-error" || state === "output-denied") {
    return (
      <Alert variant="destructive" role="alert" className="border shadow-none">
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{errorText || "Couldn't load this view. Please retry."}</AlertDescription>
      </Alert>
    );
  }
  return (
    <Card
      size="sm"
      className="w-full min-w-0 gap-5 rounded-2xl border border-gray-alpha-150 bg-card shadow-xs ring-0 [--card-spacing:--spacing(5)]"
    >
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-3">
        <CardContent
          aria-hidden="true"
          className="row-span-2 flex size-9 items-center justify-center rounded-xl bg-gray-alpha-100 p-0 text-text-secondary"
        >
          <HugeiconsIcon icon={SparklesIcon} size={18} strokeWidth={2} />
        </CardContent>
        <CardTitle className="text-sm font-medium">{displayDates(title)}</CardTitle>
        {description ? (
          <CardDescription className="col-start-2 text-xs/relaxed">
            {displayDates(description)}
          </CardDescription>
        ) : null}
      </CardHeader>
      {action && state === "output-available" ? (
        <CardContent className="-mt-2 flex flex-wrap items-center gap-2">{action}</CardContent>
      ) : null}
      <CardContent className="flex min-w-0 flex-col gap-4 text-sm">
        {state === "output-available" && output ? (
          children
        ) : (
          <CardContent
            role="status"
            aria-label={`Loading ${title}`}
            className="flex flex-col gap-3 px-0"
          >
            <Skeleton className="h-3 w-3/4 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </CardContent>
        )}
      </CardContent>
      {artifact && !expanded && state === "output-available" && (
        <CardContent className="-mt-2">
          <ArtifactOpenButton artifact={artifact} />
        </CardContent>
      )}
    </Card>
  );
}
