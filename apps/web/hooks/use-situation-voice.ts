"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useSituationVoice(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const active = useRef(false);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const stop = useCallback(() => {
    if (active.current) recognition.current?.stop();
  }, []);
  const start = useCallback(() => {
    if (!recognition.current || active.current) return;
    try {
      recognition.current.start();
      active.current = true;
      setListening(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Voice input unavailable. Type your situation.",
      );
    }
  }, []);
  useEffect(() => {
    const browser = window as unknown as SpeechWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) return;
    setSupported(true);
    const instance = new Constructor();
    instance.lang = "en-GB";
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (event) => {
      const text = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      if (text) callback.current(text);
    };
    instance.onerror = (event) => {
      if (event.error !== "aborted")
        toast.error("Voice input interrupted. Type your situation or hold to try again.");
      active.current = false;
      setListening(false);
    };
    instance.onend = () => {
      active.current = false;
      setListening(false);
    };
    recognition.current = instance;
    return () => {
      instance.onresult = null;
      instance.onend = null;
      instance.onerror = null;
      instance.stop();
      recognition.current = null;
    };
  }, []);
  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          "input,textarea,select,button,[contenteditable],#ask-medlyn-dock,[role=dialog]",
        )
      )
        return;
      if (event.code === "Space" && supported && !event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        start();
      }
    }
    function up(event: KeyboardEvent) {
      if (event.code === "Space" && active.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        stop();
      }
    }
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", stop);
    };
  }, [supported, start, stop]);
  return { supported, listening, start, stop };
}
