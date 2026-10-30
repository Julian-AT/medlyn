"use client";

import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ToolProps<Output, Input = unknown> = {
  state: string;
  input?: Input;
  output?: Output;
  errorText?: string;
};

type Props = ToolProps<unknown> & { title: string; description?: string; children: ReactNode };

export function ToolFrame({ state, output, errorText, title, description, children }: Props) {
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
      className="min-w-0 rounded-xl border shadow-none ring-0 [--card-spacing:--spacing(5)]"
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {state === "output-available" && output ? (
          children
        ) : (
          <CardContent role="status" aria-label={`Loading ${title}`} className="space-y-2 px-0">
            <Skeleton className="h-3 w-3/4 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="h-3 w-1/2 rounded-sm" />
          </CardContent>
        )}
      </CardContent>
    </Card>
  );
}
