"use client";

import { ArrowUp02Icon, Mic01Icon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatStatus } from "ai";
import { useEffect, useState } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const { patient } = useActivePatient();
  const [text, setText] = useState("");
  const voice = useSituationVoice((transcript) =>
    setText((value) => `${value} ${transcript}`.trim()),
  );
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (busy) voice.stop();
  }, [busy, voice.stop]);
  return (
    <PromptInput
      maxFiles={0}
      className="[&>[data-slot=input-group]]:rounded-2xl [&>[data-slot=input-group]]:border-0 [&>[data-slot=input-group]]:bg-card [&>[data-slot=input-group]]:shadow-[0_2px_20px_-5px_color-mix(in_srgb,var(--foreground)_16%,transparent)] [&>[data-slot=input-group]]:ring-1 [&>[data-slot=input-group]]:ring-foreground/5"
      onSubmit={async () => {
        if (busy || !text.trim()) return;
        await onSubmit(text.trim());
        setText("");
      }}
    >
      <PromptInputTextarea
        aria-label={`Ask about ${patient.displayName}`}
        placeholder={`Ask about ${patient.displayName.split(" ")[0]}’s care…`}
        className="min-h-24 px-5 pt-4 pb-2 text-base leading-relaxed md:text-base"
        value={text}
        maxLength={6000}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
      />
      <PromptInputFooter className="px-3 pb-3">
        <PromptInputTools>
          {voice.supported && (
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputButton
                  aria-label={voice.listening ? "Stop listening" : "Dictate question"}
                  aria-pressed={voice.listening}
                  className="size-9 text-primary hover:bg-primary/10 hover:text-primary aria-pressed:bg-primary/10"
                  disabled={busy}
                  onClick={voice.listening ? voice.stop : voice.start}
                >
                  <HugeiconsIcon
                    icon={voice.listening ? StopIcon : Mic01Icon}
                    size={20}
                    strokeWidth={1.75}
                  />
                </PromptInputButton>
              </TooltipTrigger>
              <TooltipContent>
                {voice.listening ? "Finish dictation" : "Dictate a question"}
              </TooltipContent>
            </Tooltip>
          )}
          <CardDescription className="px-2 text-xs" aria-live="polite">
            {voice.listening ? "Listening…" : "Ask Medlyn"}
          </CardDescription>
        </PromptInputTools>
        <PromptInputSubmit
          aria-label={busy ? "Stop response" : "Send question"}
          className="size-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          status={status}
          disabled={busy ? !onStop : !text.trim()}
          type={busy ? "button" : "submit"}
          onClick={busy ? onStop : undefined}
        >
          <HugeiconsIcon icon={busy ? StopIcon : ArrowUp02Icon} size={20} strokeWidth={1.75} />
        </PromptInputSubmit>
      </PromptInputFooter>
    </PromptInput>
  );
}
