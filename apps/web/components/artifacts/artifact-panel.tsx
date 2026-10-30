"use client";

import { Cancel01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtifactContent } from "./artifact-content";
import { ArtifactSources } from "./artifact-sources";
import type { Artifact } from "./artifact-state";

const titles = {
  passage: "Source passage",
  document: "Full document",
  findings: "Compare findings",
  lens: "Situation lens",
  letter: "GP follow-up letter",
  chart: "Measurement trend",
};

export function ArtifactPanel({
  artifact,
  messages,
  onClose,
}: {
  artifact: Artifact;
  messages: UIMessage[];
  onClose: () => void;
}) {
  return (
    <Card
      className="h-full min-h-0 gap-0 rounded-none border-0 bg-background p-0 shadow-none ring-0"
      role="complementary"
      aria-label={titles[artifact.kind]}
    >
      <CardHeader className="flex shrink-0 flex-row items-center gap-3 rounded-none px-5 py-4">
        <CardContent
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-2)] p-0"
        >
          <HugeiconsIcon icon={File02Icon} size={18} strokeWidth={2} />
        </CardContent>
        <CardContent className="min-w-0 flex-1 p-0">
          <CardTitle className="text-sm">{titles[artifact.kind]}</CardTitle>
          <CardDescription className="text-xs">From this conversation</CardDescription>
        </CardContent>
        <Button variant="ghost" size="icon-sm" aria-label="Close artifact panel" onClick={onClose}>
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
        </Button>
      </CardHeader>
      <ScrollArea className="min-h-0 flex-1">
        <CardContent className="px-5 pb-8 pt-2">
          {artifact.kind === "passage" && (
            <ArtifactSources messages={messages} segmentId={artifact.id} />
          )}
          <ArtifactContent
            key={`${artifact.kind}:${artifact.id}`}
            artifact={artifact}
            messages={messages}
          />
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
