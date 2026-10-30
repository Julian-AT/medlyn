"use client";

import { Database02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDate } from "@medlyn/engine/dates";
import type { UIMessage } from "ai";
import { Context, ContextContent, ContextTrigger } from "@/components/ai-elements/context";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { evidenceScope } from "./evidence-scope";

export function EvidenceContext({ message }: { message: UIMessage }) {
  const scope = evidenceScope(message);
  if (!scope) return null;
  const rows = [
    ["Documents in scope", scope.eligible],
    ["Documents returned", scope.retrievedDocuments],
    ["Facts returned", scope.retrievedFacts],
    [
      "Full-document check",
      scope.searched === null ? "Not completed" : `${scope.searched} documents`,
    ],
  ];
  return (
    <Context>
      <ContextTrigger aria-label="Evidence scope">
        <HugeiconsIcon icon={Database02Icon} size={13} strokeWidth={2} aria-hidden="true" />
        Evidence scope · {scope.eligible} {scope.eligible === 1 ? "document" : "documents"}
      </ContextTrigger>
      <ContextContent aria-label="Evidence scope">
        <CardContent className="space-y-1 px-0">
          <CardTitle className="text-sm font-medium">Evidence scope</CardTitle>
          <CardDescription className="text-xs">As of {formatDate(scope.asOf)}</CardDescription>
        </CardContent>
        <CardContent className="space-y-2 px-0">
          {rows.map(([label, value]) => (
            <CardDescription
              key={label}
              className="flex items-center justify-between gap-4 text-xs"
            >
              {label}
              <CardTitle className="text-xs font-medium tabular-nums text-foreground">
                {value}
              </CardTitle>
            </CardDescription>
          ))}
        </CardContent>
        <CardDescription className="border-t border-border pt-3 text-xs/5">
          Returned evidence covers the tool results for this answer. Only a completed full-document
          check can establish that something is not documented.
        </CardDescription>
      </ContextContent>
    </Context>
  );
}
