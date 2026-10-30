"use client";

import { Mic01Icon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatStatus } from "ai";
import { useState } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useSituationVoice } from "@/hooks/use-situation-voice";

export function ChatComposer({
  onSubmit,
  status = "ready",
  onStop,
}: {
  onSubmit: (text: string) => void | Promise<void>;
  status?: ChatStatus;
  onStop?: () => void;
}) {
  const [text, setText] = useState("");
  const voice = useSituationVoice((transcript) =>
    setText((value) => `${value} ${transcript}`.trim()),
  );
  const busy = status === "submitted" || status === "streaming";
  return (
    <PromptInput
      maxFiles={0}
      onSubmit={async () => {
        if (busy || !text.trim()) return;
        await onSubmit(text.trim());
        setText("");
      }}
    >
      <PromptInputTextarea
        aria-label="Ask about Anna Musterfrau"
        placeholder="Ask about Anna’s care…"
        value={text}
        maxLength={6000}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
      />
      <PromptInputFooter>
        <PromptInputTools>
          {voice.supported && (
            <PromptInputButton
              aria-label={voice.listening ? "Stop listening" : "Dictate question"}
              aria-pressed={voice.listening}
              disabled={busy}
              onClick={voice.listening ? voice.stop : voice.start}
            >
              <HugeiconsIcon icon={voice.listening ? StopIcon : Mic01Icon} />
            </PromptInputButton>
          )}
        </PromptInputTools>
        <PromptInputSubmit
          aria-label={busy ? "Stop response" : "Send question"}
          status={status}
          disabled={!busy && !text.trim()}
          type={busy ? "button" : "submit"}
          onClick={busy ? onStop : undefined}
        />
      </PromptInputFooter>
    </PromptInput>
  );
}
