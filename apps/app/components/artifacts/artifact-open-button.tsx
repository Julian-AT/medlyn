"use client";

import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { type Artifact, openArtifact } from "./artifact-state";

export function ArtifactOpenButton({ artifact }: { artifact: Artifact }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-fit gap-1 rounded-full text-xs text-muted-foreground hover:text-foreground"
      onClick={() => openArtifact(artifact)}
    >
      Open in panel
      <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} strokeWidth={2} aria-hidden="true" />
    </Button>
  );
}
