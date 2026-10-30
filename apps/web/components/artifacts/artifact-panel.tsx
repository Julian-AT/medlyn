"use client";

import { CheckmarkCircle02Icon, Copy01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UIMessage } from "ai";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArtifactAction,
  ArtifactActions,
  ArtifactContent as ArtifactBody,
  ArtifactClose,
  ArtifactDescription,
  Artifact as ArtifactFrame,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtifactContent } from "./artifact-content";
import type { Artifact } from "./artifact-state";

const titles = {
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
  const body = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const key = `${artifact.kind}:${artifact.id}`;
  return (
    <ArtifactFrame
      className="h-full min-h-0 rounded-none border-0 bg-background ring-0"
      role="complementary"
      aria-label={titles[artifact.kind]}
    >
      <ArtifactHeader className="gap-3 bg-background px-5 py-3">
        <HugeiconsIcon
          icon={File02Icon}
          size={18}
          strokeWidth={2}
          className="shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <CardContent className="min-w-0 flex-1 space-y-1 p-0">
          <ArtifactTitle className="truncate">{titles[artifact.kind]}</ArtifactTitle>
          <ArtifactDescription>{titles[artifact.kind]}</ArtifactDescription>
        </CardContent>
        <ArtifactActions>
          <ArtifactAction
            tooltip={copied === key ? "Copied" : "Copy content"}
            icon={copied === key ? CheckmarkCircle02Icon : Copy01Icon}
            onClick={async () => {
              const text = Array.from(body.current?.querySelectorAll("p") ?? [])
                .map((node) => node.textContent?.trim())
                .filter(Boolean)
                .join("\n\n");
              if (!text) return;
              try {
                await navigator.clipboard.writeText(text);
                setCopied(key);
              } catch (error) {
                console.warn(
                  "artifact_copy_unavailable",
                  error instanceof Error ? error.name : "Unknown",
                );
                toast.error("Couldn't copy this content. Select the text to copy it.");
              }
            }}
          />
          <ArtifactClose aria-label="Close artifact panel" onClick={onClose} />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactBody className="overflow-hidden p-0">
        <ScrollArea className="h-full">
          <CardContent ref={body} className="px-5 pb-8 pt-5">
            <ArtifactContent key={key} artifact={artifact} messages={messages} />
          </CardContent>
        </ScrollArea>
      </ArtifactBody>
    </ArtifactFrame>
  );
}
