"use client";

import { Claim } from "@medlyn/engine/contracts";
import type { UIMessage } from "ai";
import { z } from "zod";
import { SourceCitation } from "@/components/chat/source-citation";
import { CardContent, CardDescription } from "@/components/ui/card";

const Validated = z.object({ claims: z.array(Claim) });

export function ArtifactSources({
  messages,
  segmentId,
}: {
  messages: UIMessage[];
  segmentId: string;
}) {
  const sources =
    messages
      .map((message) => [
        ...new Set(
          message.parts.flatMap((part) => {
            if (part.type !== "data-validated") return [];
            const parsed = Validated.safeParse(part.data);
            return parsed.success ? parsed.data.claims.flatMap((claim) => claim.segmentIds) : [];
          }),
        ),
      ])
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
