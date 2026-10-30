"use client";

import { Search } from "lucide-react";
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
          <Search />
        </EmptyMedia>
        <EmptyTitle>Start an investigation</EmptyTitle>
        <EmptyDescription>Choose an open question or ask about the record.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {suggestions.map((question) => (
          <Button
            key={question}
            variant="outline"
            size="sm"
            onClick={() => onSelect(question)}
          >
            {question}
          </Button>
        ))}
      </EmptyContent>
    </Empty>
  );
}
