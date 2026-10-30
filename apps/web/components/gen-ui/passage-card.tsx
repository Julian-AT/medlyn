"use client";

import type { UiToolOutputs } from "@medlyn/engine/agent/ui-tools";
import { useState } from "react";
import { CardContent, CardDescription } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { displayDates } from "./display-dates";
import { SourceChip } from "./source-chip";
import { ToolFrame, type ToolProps } from "./tool-frame";

export function PassageCard(props: ToolProps<UiToolOutputs["show_passage"]>) {
  const [language, setLanguage] = useState("de");
  const { output } = props;
  const segments = output
    ? props.expanded
      ? [...output.before, output.segment, ...output.after]
      : [output.segment]
    : [];
  return (
    <ToolFrame
      {...props}
      title={output?.document.titleEn || "Source passage"}
      description={
        output
          ? `${displayDates(output.document.docDate)} · ${output.document.department}`
          : undefined
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
              ? "flex flex-col gap-2 rounded-xl border-0 bg-muted p-3"
              : "flex flex-col gap-2 px-0 py-0"
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
