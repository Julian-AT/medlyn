"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionConstructor = new () => Recognition;
type SpeechWindow = {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
};

export function usePushToTalk(
  onTranscript: (text: string) => void,
  language: string,
  disabled: boolean,
) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const transcript = useRef("");
  const submit = useRef(onTranscript);
  submit.current = onTranscript;
  useEffect(() => {
    const speechWindow = window as unknown as SpeechWindow;
    setSupported(Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition));
    return () => {
      if (recognition.current) {
        recognition.current.onend = null;
        recognition.current.abort();
      }
    };
  }, []);
  const start = useCallback(() => {
    if (disabled || recognition.current) return;
    const speechWindow = window as unknown as SpeechWindow;
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) return;
    const instance = new Constructor();
    recognition.current = instance;
    transcript.current = "";
    setError(null);
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = false;
    instance.onresult = (event) => {
      for (let index = event.resultIndex; index < event.results.length; index++) {
        if (event.results[index].isFinal) {
          transcript.current += `${event.results[index][0].transcript} `;
        }
      }
    };
    instance.onerror = (event) => {
      setError(`Microphone unavailable (${event.error}). You can type your question.`);
    };
    instance.onend = () => {
      recognition.current = null;
      setListening(false);
      const text = transcript.current.trim();
      transcript.current = "";
      if (text) submit.current(text);
    };
    try {
      instance.start();
      setListening(true);
    } catch (cause) {
      recognition.current = null;
      setError(cause instanceof Error ? cause.message : "Microphone unavailable");
    }
  }, [disabled, language]);
  const stop = useCallback(() => { recognition.current?.stop(); }, []);
  useEffect(() => {
    if (!supported) return;
    const editable = (target: EventTarget | null) => target instanceof HTMLElement
      && (target.isContentEditable || Boolean(target.closest("input, textarea, select, button")));
    const down = (event: KeyboardEvent) => {
      const dock = document.getElementById("ask-medlyn-dock");
      if (event.code !== "Space" || event.repeat || editable(event.target)) return;
      if (!dock?.contains(document.activeElement)) return;
      event.preventDefault();
      start();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space" || editable(event.target)) return;
      event.preventDefault();
      stop();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
    };
  }, [supported, start, stop]);
  return { supported, listening, error, start, stop };
}
