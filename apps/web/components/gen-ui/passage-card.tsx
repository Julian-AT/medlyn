"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { useState } from "react";
import { CardContent, CardDescription } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function PassageCard(props: ToolProps<UiToolOutputs["show_passage"]>) {
  const [language, setLanguage] = useState("de");
  const { output } = props;
  const segments = output ? [...output.before, output.segment, ...output.after] : [];
  return (
    <ToolFrame
      {...props}
      title={output?.document.titleEn || "Source passage"}
      description={
        output ? `${output.document.docDate} · ${output.document.department}` : undefined
      }
    >
      <ToggleGroup
        type="single"
        value={language}
        onValueChange={(value) => value && setLanguage(value)}
        size="sm"
      >
        <ToggleGroupItem value="de" aria-label="German source text">
          DE
        </ToggleGroupItem>
        <ToggleGroupItem value="en" aria-label="English translation">
          EN
        </ToggleGroupItem>
      </ToggleGroup>
      {segments.map((segment) => (
        <CardContent
          key={segment.id}
          className={
            segment.id === output?.segment.id
              ? "space-y-2 rounded-md border bg-accent p-3"
              : "space-y-2 px-0 py-0"
          }
        >
          <CardDescription className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {language === "de" ? segment.text : segment.textEn || "Translation unavailable."}
          </CardDescription>
          <SourceChip segmentId={segment.id} quote={segment.text} />
        </CardContent>
      ))}
    </ToolFrame>
  );
}
