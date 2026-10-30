"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { SourceChip } from "./SourceChip.tsx";

function sourceIds(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(sourceIds);
  const object = value as Record<string, unknown>;
  return [
    ...(typeof object.segmentId === "string" ? [object.segmentId] : []),
    ...(Array.isArray(object.segmentIds)
      ? object.segmentIds.filter((id): id is string => typeof id === "string")
      : []),
    ...Object.values(object).flatMap(sourceIds),
  ];
}

export function ToolStep({
  toolName,
  args,
  result,
  status,
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const query = args.query ?? args.concept ?? args.entityOrKind ?? args.topic ?? args.expression;
  const ids = [...new Set(sourceIds(result))];
  const running = status.type === "running";
  const unavailable = Boolean(
    result && typeof result === "object" && "status" in result && result.status === "unavailable",
  );
  const failed = status.type === "incomplete" || unavailable;
  return (
    <Card size="sm" className="mx-3 my-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="capitalize">{toolName.replaceAll("_", " ")}</CardTitle>
        <Badge variant={failed ? "destructive" : "secondary"}>
          {running ? <Spinner /> : null}
          {running ? "Checking…" : failed ? "Couldn’t check" : "Done"}
        </Badge>
      </CardHeader>
      {typeof query === "string" ? (
        <CardContent>
          <CardDescription className="break-words">Search: {query}</CardDescription>
        </CardContent>
      ) : null}
      {ids.length ? (
        <CardContent className="flex flex-wrap gap-1">
          {ids.map((id) => (
            <SourceChip key={id} segmentId={id} />
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}
