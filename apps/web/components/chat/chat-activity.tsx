"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isToolUIPart, type UIMessage } from "ai";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Card, CardContent } from "@/components/ui/card";

const ACTIVITIES: Record<string, string> = {
  "tool-open_lens": "Preparing the situation…",
  "tool-show_medications": "Checking medication sources…",
  "tool-show_lab_trend": "Reading measurements…",
  "tool-show_timeline": "Building the timeline…",
  "tool-show_findings": "Checking open questions…",
  "tool-show_passage": "Opening the source passage…",
  "tool-draft_letter": "Preparing the GP letter…",
  "tool-check_documented": "Checking eligible documents…",
};

export function ChatActivity({ message }: { message?: UIMessage }) {
  const activeTool =
    message?.role === "assistant"
      ? message.parts.findLast(
          (part) =>
            isToolUIPart(part) &&
            (part.state === "input-streaming" || part.state === "input-available"),
        )
      : undefined;
  const label = activeTool ? ACTIVITIES[activeTool.type] : undefined;
  return (
    <Card
      role="status"
      aria-live="polite"
      className="w-fit rounded-xl bg-transparent py-2 shadow-none ring-0"
    >
      <CardContent className="flex items-center gap-2 px-0">
        <HugeiconsIcon
          icon={Search01Icon}
          size={18}
          strokeWidth={1.75}
          className="text-primary"
          aria-hidden="true"
        />
        <Shimmer className="text-sm">{label ?? "Searching source documents…"}</Shimmer>
      </CardContent>
    </Card>
  );
}
