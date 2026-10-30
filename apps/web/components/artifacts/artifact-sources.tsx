"use client";

import type { UIMessage } from "ai";
import { messageEvidence } from "@/components/chat/message-evidence";
import { SourceCitation } from "@/components/chat/source-citation";
import { CardContent, CardDescription } from "@/components/ui/card";

export function ArtifactSources({
  messages,
  segmentId,
}: {
  messages: UIMessage[];
  segmentId: string;
}) {
  const sources =
    messages
      .map((message) => messageEvidence(message).sources)
      .findLast((ids) => ids.includes(segmentId)) ?? [];
  if (sources.length < 2) return null;
  return (
    <CardContent
      className="flex flex-wrap items-center gap-1 px-0 pb-4"
      aria-label="Sources for this answer"
    >
      <CardDescription className="mr-1 text-xs">Sources</CardDescription>
      {sources.map((id, index) => (
        <SourceCitation key={id} segmentId={id} index={index} />
      ))}
    </CardContent>
  );
}
