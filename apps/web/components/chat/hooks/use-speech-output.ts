"use client";

import { useCallback, useEffect, useRef } from "react";

export type ValidatedSpeech = { text: string; receipt: string };
type Playback = { controller: AbortController; audio?: HTMLAudioElement; url?: string };

export function useSpeechOutput() {
  const active = useRef<Playback | null>(null);
  const stop = useCallback(() => {
    active.current?.controller.abort();
    active.current?.audio?.pause();
    if (active.current?.url) URL.revokeObjectURL(active.current.url);
    active.current = null;
    window.speechSynthesis?.cancel();
  }, []);
  useEffect(() => stop, [stop]);
  const speak = useCallback(
    async (speech: ValidatedSpeech) => {
      stop();
      const current: Playback = { controller: new AbortController() };
      active.current = current;
      try {
        const response = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(speech),
          signal: current.controller.signal,
        });
        if (!response.ok) throw new Error("Voice unavailable");
        const blob = await response.blob();
        if (current.controller.signal.aborted) return;
        current.url = URL.createObjectURL(blob);
        current.audio = new Audio(current.url);
        current.audio.onended = () => {
          if (current.url) URL.revokeObjectURL(current.url);
        };
        await current.audio.play();
      } catch (error) {
        if (current.controller.signal.aborted) return;
        console.warn(
          "tts_browser_fallback",
          error instanceof Error ? error.name : "Voice unavailable",
        );
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(speech.text);
          utterance.lang = "en-GB";
          window.speechSynthesis.speak(utterance);
        }
      }
    },
    [stop],
  );
  return { speak, stop };
}
