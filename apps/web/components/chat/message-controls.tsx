"use client";

import {
  CheckmarkCircle02Icon,
  Copy01Icon,
  File02Icon,
  RefreshIcon,
  StopIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  VolumeHighIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { MessageAction, MessageActions } from "@/components/ai-elements/message";
import { SourcesListPopover } from "@/components/sources/sources-list-popover";
import { Button } from "@/components/ui/button";
import { useMessageFeedback } from "./hooks/use-message-feedback";
import type { ValidatedSpeech } from "./hooks/use-speech-output";

export function MessageControls({
  id,
  text,
  sources,
  speech,
  onSpeak,
  onStopSpeech,
  speaking,
  onRetry,
  disabled,
}: {
  id: string;
  text: string;
  sources: string[];
  speech: ValidatedSpeech[];
  onSpeak: (speech: ValidatedSpeech[]) => void;
  onStopSpeech: () => void;
  speaking: boolean;
  onRetry?: () => void;
  disabled: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { vote, choose } = useMessageFeedback(id);
  return (
    <MessageActions className="gap-0.5 text-muted-foreground" aria-label="Answer actions">
      {text && (
        <MessageAction
          tooltip={copied ? "Copied" : "Copy answer"}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            } catch (error) {
              console.warn(
                "chat_copy_unavailable",
                error instanceof Error ? error.name : "Unknown",
              );
              toast.error("Couldn't copy the answer. Select the text to copy it.");
            }
          }}
        >
          <HugeiconsIcon
            icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
            size={16}
            strokeWidth={2}
          />
        </MessageAction>
      )}
      {onRetry && (
        <MessageAction tooltip="Regenerate answer" onClick={onRetry} disabled={disabled}>
          <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} />
        </MessageAction>
      )}
      {speech.length > 0 && (
        <MessageAction
          tooltip={speaking ? "Stop reading" : "Read checked answer"}
          disabled={disabled}
          aria-pressed={speaking}
          onClick={() => (speaking ? onStopSpeech() : onSpeak(speech))}
        >
          <HugeiconsIcon icon={speaking ? StopIcon : VolumeHighIcon} size={16} strokeWidth={2} />
        </MessageAction>
      )}
      {sources.length > 0 && (
        <SourcesListPopover
          sources={sources.map((segmentId) => ({ segmentId }))}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Open sources">
              <HugeiconsIcon icon={File02Icon} size={16} strokeWidth={2} />
            </Button>
          }
        />
      )}
      <MessageAction
        tooltip="Helpful · saved on this device"
        aria-pressed={vote === "up"}
        className="aria-pressed:bg-accent aria-pressed:text-foreground"
        onClick={() => choose("up")}
      >
        <HugeiconsIcon icon={ThumbsUpIcon} size={16} strokeWidth={2} />
      </MessageAction>
      <MessageAction
        tooltip="Not helpful · saved on this device"
        aria-pressed={vote === "down"}
        className="aria-pressed:bg-accent aria-pressed:text-foreground"
        onClick={() => choose("down")}
      >
        <HugeiconsIcon icon={ThumbsDownIcon} size={16} strokeWidth={2} />
      </MessageAction>
    </MessageActions>
  );
}
