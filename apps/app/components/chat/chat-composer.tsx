"use client";

import { ArrowUp02Icon, Mic01Icon, StopIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChatStatus } from "ai";
import { useEffect, useRef, useState } from "react";
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { Badge } from "@/components/ui/badge";
import { InputGroupAddon } from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSituationVoice } from "@/hooks/use-situation-voice";
import { appendDictation } from "./hooks/use-speech-state";

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
  const dictationBase = useRef("");
  const latestText = useRef(text);
  latestText.current = text;
  const transcript = (value: string) =>
    setText(appendDictation(dictationBase.current, value).slice(0, 6000));
  const voice = useSituationVoice(transcript, {
    onInterim: transcript,
    onStart: () => {
      dictationBase.current = latestText.current;
    },
    keyboard: false,
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (busy) voice.cancel();
  }, [busy, voice.cancel]);
  return (
    <PromptInput
      maxFiles={0}
      className="[&>[data-slot=input-group]]:min-h-12 [&>[data-slot=input-group]]:items-end [&>[data-slot=input-group]]:rounded-[26px] [&>[data-slot=input-group]]:border-border/50 [&>[data-slot=input-group]]:bg-background [&>[data-slot=input-group]]:shadow-none"
      onSubmit={async () => {
        if (busy || !text.trim()) return;
        voice.cancel();
        const question = text.trim();
        setText("");
        try {
          await onSubmit(question);
        } catch (error) {
          setText(question);
          throw error;
        }
      }}
    >
      <PromptInputTextarea
        aria-label={`Ask about ${patient.displayName}`}
        placeholder={
          voice.listening ? "Dictating…" : `Ask about ${patient.displayName.split(" ")[0]}’s care…`
        }
        className="max-h-40 min-h-12 px-4 py-3 text-base/6 md:text-sm/6"
        rows={1}
        value={text}
        maxLength={6000}
        disabled={busy}
        onChange={(event) => {
          voice.cancel();
          setText(event.target.value);
        }}
      />
      <InputGroupAddon align="inline-end" className="gap-1 self-end p-1.5">
        {voice.supported && (
          <>
            {voice.listening && (
              <Badge variant="secondary" role="status" aria-live="polite">
                {voice.phase === "starting"
                  ? "Starting…"
                  : voice.phase === "stopping"
                    ? "Finishing…"
                    : "Listening…"}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputButton
                  aria-label={voice.listening ? "Stop listening" : "Dictate question"}
                  aria-pressed={voice.listening}
                  className="size-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground aria-pressed:motion-safe:animate-pulse aria-pressed:bg-accent aria-pressed:text-foreground"
                  disabled={busy}
                  onClick={voice.listening ? voice.stop : voice.start}
                >
                  <HugeiconsIcon
                    icon={voice.listening ? StopIcon : Mic01Icon}
                    size={20}
                    strokeWidth={2}
                  />
                </PromptInputButton>
              </TooltipTrigger>
              <TooltipContent>
                {voice.listening ? "Finish dictation" : "Dictate a question"}
              </TooltipContent>
            </Tooltip>
          </>
        )}
        <PromptInputSubmit
          aria-label={busy ? "Stop response" : "Send question"}
          className="size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          status={status}
          disabled={busy ? !onStop : !text.trim()}
          type={busy ? "button" : "submit"}
          onClick={busy ? onStop : undefined}
        >
          <HugeiconsIcon icon={busy ? StopIcon : ArrowUp02Icon} size={18} strokeWidth={2} />
        </PromptInputSubmit>
      </InputGroupAddon>
    </PromptInput>
  );
}
