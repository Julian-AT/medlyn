"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

const suggestions = ["Investigate a follow-up", "Check what is missing", "Compare source passages"];

export function DockEmpty({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HugeiconsIcon icon={Search01Icon} strokeWidth={2} aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Start an investigation</EmptyTitle>
        <EmptyDescription>Choose an open question or ask about the record.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {suggestions.map((question) => (
          <Button key={question} variant="outline" size="sm" onClick={() => onSelect(question)}>
            {question}
          </Button>
        ))}
      </EmptyContent>
    </Empty>
  );
}
