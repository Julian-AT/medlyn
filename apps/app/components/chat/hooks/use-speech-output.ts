"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type ValidatedSpeech = { text: string; receipt: string };
type Playback = { controller: AbortController; audio?: HTMLAudioElement; url?: string };

async function playBrowserSpeech(text: string, signal: AbortSignal) {
  if (!("speechSynthesis" in window)) throw new Error("Browser speech unavailable");
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener("abort", finish);
      resolve();
    };
    utterance.onend = finish;
    utterance.onerror = () => {
      signal.removeEventListener("abort", finish);
      reject(new Error("Browser playback failed"));
    };
    signal.addEventListener("abort", finish, { once: true });
    window.speechSynthesis.speak(utterance);
  });
}

export function useSpeechOutput() {
  const active = useRef<Playback | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const stop = useCallback(() => {
    active.current?.controller.abort();
    active.current?.audio?.pause();
    if (active.current?.url) URL.revokeObjectURL(active.current.url);
    active.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);
  useEffect(() => stop, [stop]);
  const speakAll = useCallback(
    async (speeches: ValidatedSpeech[]) => {
      stop();
      if (!speeches.length) return;
      const current: Playback = { controller: new AbortController() };
      const { signal } = current.controller;
      active.current = current;
      setSpeaking(true);
      try {
        for (const speech of speeches) {
          if (signal.aborted) return;
          let rejected = false;
          try {
            const response = await fetch("/api/voice/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(speech),
              signal,
            });
            rejected = response.status === 400 || response.status === 403;
            if (!response.ok) throw new Error("Voice unavailable");
            const blob = await response.blob();
            if (signal.aborted) return;
            current.url = URL.createObjectURL(blob);
            const audio = new Audio(current.url);
            current.audio = audio;
            await new Promise<void>((resolve, reject) => {
              const finish = () => {
                signal.removeEventListener("abort", finish);
                resolve();
              };
              audio.onended = finish;
              audio.onerror = () => {
                signal.removeEventListener("abort", finish);
                reject(new Error("Playback failed"));
              };
              signal.addEventListener("abort", finish, { once: true });
              audio.play().catch((error: unknown) => {
                signal.removeEventListener("abort", finish);
                reject(error);
              });
            });
          } catch (error) {
            if (signal.aborted) return;
            if (rejected) {
              toast.error("This voice validation expired. Regenerate the answer to read it aloud.");
              return;
            }
            console.warn(
              "tts_browser_fallback",
              error instanceof Error ? error.name : "Unavailable",
            );
            await playBrowserSpeech(speech.text, signal);
          } finally {
            if (current.url) URL.revokeObjectURL(current.url);
            current.url = undefined;
          }
        }
      } catch (error) {
        if (!signal.aborted) {
          console.warn("tts_playback_failed", error instanceof Error ? error.name : "Unknown");
          toast.error("Couldn't play this answer. The checked text is available in chat.");
        }
      } finally {
        if (active.current === current) {
          active.current = null;
          setSpeaking(false);
        }
      }
    },
    [stop],
  );
  const speak = useCallback((speech: ValidatedSpeech) => speakAll([speech]), [speakAll]);
  return { speak, speakAll, speaking, stop };
}
