"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { z } from "zod";
import { Claim } from "@medlyn/engine/contracts";
import { useSpeechOutput } from "./use-speech-output.ts";

const ValidatedAnswer = z.object({
  claims: z.array(Claim),
  nextAction: z.enum(["Add to the GP letter", "Leave open"]).nullable(),
  speech: z.object({ text: z.string(), receipt: z.string() }).nullable(),
  citations: z.record(z.string(), z.string()).default({}),
});
export type Answer = z.infer<typeof ValidatedAnswer>;

export function useDockRuntime(lensKey: string | null, sessionId: string) {
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [citations, setCitations] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const speech = useSpeechOutput();
  const speakRef = useRef(speakEnabled);
  speakRef.current = speakEnabled;
  const requestContext = useRef({ lensKey, sessionId, spoken: speakEnabled });
  requestContext.current = { lensKey, sessionId, spoken: speakEnabled };
  const transport = useMemo(
    () => new AssistantChatTransport({ api: "/api/agent", body: () => requestContext.current }),
    [],
  );
  const runtime = useChatRuntime({
    transport,
    sendAutomaticallyWhen: () => false,
    onData: (part) => {
      if (part.type !== "data-validated") return;
      const parsed = ValidatedAnswer.safeParse(part.data);
      if (!parsed.success) return;
      setAnswer(parsed.data);
      setCitations((previous) => ({ ...previous, ...parsed.data.citations }));
      if (speakRef.current && parsed.data.speech) void speech.speak(parsed.data.speech);
    },
    onError: () => setError("Couldn’t complete this investigation. Please try again."),
  });
  useEffect(() => {
    let wasRunning = runtime.thread.getState().isRunning;
    return runtime.thread.subscribe(() => {
      const running = runtime.thread.getState().isRunning;
      setBusy(running);
      if (running && !wasRunning) {
        setAnswer(null);
        setError(null);
        speech.stop();
      }
      wasRunning = running;
    });
  }, [runtime, speech.stop]);
  useEffect(() => {
    const investigate = (event: Event) => {
      const detail = (event as CustomEvent<{ question?: unknown }>).detail;
      const value = detail?.question;
      const question = typeof value === "string" ? value
        : value && typeof value === "object" && "title" in value && typeof value.title === "string"
          ? value.title : null;
      if (!question?.trim()) return;
      runtime.thread.cancelRun();
      speech.stop();
      runtime.thread.composer.setText(question);
      runtime.thread.composer.send();
      document.getElementById("ask-medlyn-dock")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    };
    window.addEventListener("medlyn:investigate", investigate);
    return () => window.removeEventListener("medlyn:investigate", investigate);
  }, [runtime, speech.stop]);

  const toggleSpeech = (enabled: boolean) => {
    setSpeakEnabled(enabled);
    speech.stop();
  };
  const leaveOpen = () => {
    runtime.thread.cancelRun();
    speech.stop();
    setAnswer(null);
  };
  return { runtime, answer, citations, busy, error, speakEnabled, toggleSpeech, leaveOpen };
}
