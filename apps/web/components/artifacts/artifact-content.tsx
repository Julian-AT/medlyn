"use client";

import { isToolUIPart, type UIMessage } from "ai";
import { renderToolPart } from "@/components/gen-ui/registry";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { Artifact } from "./artifact-state";
import { DocumentArtifact } from "./document-artifact";
import { PassageArtifact } from "./passage-artifact";

const toolTypes = {
  lens: "tool-open_lens",
  findings: "tool-show_findings",
  letter: "tool-draft_letter",
  chart: "tool-show_lab_trend",
};

export function ArtifactContent({
  artifact,
  messages,
}: {
  artifact: Artifact;
  messages: UIMessage[];
}) {
  if (artifact.kind === "passage") return <PassageArtifact segmentId={artifact.id} />;
  if (artifact.kind === "document")
    return <DocumentArtifact documentId={artifact.id} segmentId={artifact.segmentId} />;
  const part = messages
    .flatMap((message) => message.parts)
    .find(
      (part) =>
        isToolUIPart(part) &&
        part.toolCallId === artifact.id &&
        part.type === toolTypes[artifact.kind as keyof typeof toolTypes],
    );
  if (part && isToolUIPart(part) && part.type !== "dynamic-tool") return renderToolPart(part, true);
  return (
    <Empty className="rounded-2xl bg-muted/40 py-12">
      <EmptyHeader>
        <EmptyTitle>This view is unavailable</EmptyTitle>
        <EmptyDescription>
          Open an expanded view from a result in this conversation.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
