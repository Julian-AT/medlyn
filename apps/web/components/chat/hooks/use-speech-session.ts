import {
  initialSpeechState,
  type SpeechAction,
  type SpeechState,
  speechReducer,
} from "./use-speech-state.ts";

export type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult:
    | ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
export type SpeechConstructor = new () => Recognition;
export type SpeechBrowser = {
  SpeechRecognition?: SpeechConstructor;
  webkitSpeechRecognition?: SpeechConstructor;
};

/** Each session owns its events and timers, including events arriving after stop. */
export function createSpeechSession(
  Constructor: SpeechConstructor,
  language: string,
  callbacks: {
    state: (state: SpeechState) => void;
    interim: (text: string) => void;
    complete: (text: string) => void;
    error: (error: string) => void;
  },
) {
  let state = initialSpeechState;
  let recognition: Recognition | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const dispatch = (action: SpeechAction) => {
    state = speechReducer(state, action);
    callbacks.state(state);
  };
  function detach() {
    clearTimeout(timer);
    const instance = recognition;
    recognition = null;
    if (instance) {
      instance.onstart = null;
      instance.onresult = null;
      instance.onerror = null;
      instance.onend = null;
    }
    return instance;
  }
  function fail(error: string) {
    const instance = detach();
    dispatch({ type: "error", error });
    instance?.abort();
    if (error !== "aborted") callbacks.error(error);
  }
  function end() {
    if (!recognition) return;
    detach();
    const transcript = state.transcript.trim();
    dispatch({ type: "end" });
    if (transcript) callbacks.complete(transcript);
    else callbacks.error("no-speech");
  }
  function stop() {
    if (!recognition || state.phase === "stopping") return;
    clearTimeout(timer);
    dispatch({ type: "stop" });
    try {
      recognition.stop();
      // Some engines omit onend when stopped while permission is still pending.
      if (recognition)
        timer = setTimeout(() => {
          const instance = recognition;
          end();
          instance?.abort();
        }, 1500);
    } catch {
      const instance = recognition;
      end();
      instance?.abort();
    }
  }
  function start() {
    if (recognition) return;
    dispatch({ type: "start" });
    try {
      const instance = new Constructor();
      recognition = instance;
      instance.lang = language;
      instance.continuous = false;
      instance.interimResults = true;
      instance.onstart = () => {
        if (recognition !== instance) return;
        dispatch({ type: "listening" });
        if (state.phase === "listening") timer = setTimeout(stop, 8000);
      };
      instance.onresult = (event) => {
        if (recognition !== instance) return;
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();
        dispatch({ type: "result", transcript });
        callbacks.interim(transcript);
        if (state.phase !== "stopping") {
          clearTimeout(timer);
          timer = setTimeout(stop, 2500);
        }
      };
      instance.onerror = ({ error }) => {
        if (recognition === instance) fail(error);
      };
      instance.onend = () => {
        if (recognition === instance) end();
      };
      instance.start();
    } catch (error) {
      fail(
        error instanceof Error && error.name === "NotAllowedError" ? "not-allowed" : "start-failed",
      );
    }
  }
  function cancel() {
    const instance = detach();
    dispatch({ type: "end" });
    instance?.abort();
  }
  return { start, stop, cancel };
}
