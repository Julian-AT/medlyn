"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createSpeechSession } from "@/components/chat/hooks/use-speech-session";
import {
  initialSpeechState,
  speechErrorMessage,
  speechLanguage,
} from "@/components/chat/hooks/use-speech-state";
import { speechConstructor } from "@/components/chat/hooks/use-speech-support";

type VoiceOptions = {
  onInterim?: (text: string) => void;
  onStart?: () => void;
  language?: string;
  keyboard?: boolean;
};

export function useSituationVoice(
  onTranscript: (text: string) => void,
  options: VoiceOptions = {},
) {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState(initialSpeechState);
  const session = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  const callback = useRef({ onTranscript, options });
  callback.current = { onTranscript, options };
  const stop = useCallback(() => session.current?.stop(), []);
  const cancel = useCallback(() => session.current?.cancel(), []);
  const start = useCallback(() => {
    if (session.current) return;
    const Constructor = speechConstructor(window);
    if (!Constructor) {
      if (!window.isSecureContext) toast.error(speechErrorMessage("insecure-context"));
      return;
    }
    callback.current.options.onStart?.();
    const current = createSpeechSession(
      Constructor,
      speechLanguage(callback.current.options.language ?? navigator.language),
      {
        state: (next) => {
          setState(next);
          if (next.phase === "idle") session.current = null;
        },
        interim: (text) => callback.current.options.onInterim?.(text),
        complete: (text) => callback.current.onTranscript(text),
        error: (error) => toast.error(speechErrorMessage(error)),
      },
    );
    session.current = current;
    current.start();
  }, []);
  useEffect(() => {
    setSupported(Boolean(speechConstructor(window)));
    function visibility() {
      if (document.hidden) stop();
    }
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      session.current?.cancel();
      session.current = null;
    };
  }, [stop]);
  const keyboard = options.keyboard ?? true;
  useEffect(() => {
    if (!supported || !keyboard) return;
    let held = false;
    function down(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input,textarea,select,button,[contenteditable],[role=dialog]")
      )
        return;
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        event.stopImmediatePropagation();
        held = true;
        start();
      }
    }
    function up(event: KeyboardEvent) {
      if (event.code === "Space" && held) {
        event.preventDefault();
        event.stopImmediatePropagation();
        held = false;
        stop();
      }
    }
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    return () => {
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
    };
  }, [supported, keyboard, start, stop]);
  return { supported, listening: state.phase !== "idle", phase: state.phase, start, stop, cancel };
}
