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

/** Own recognition and restart timers so cancelled sessions cannot publish late events. */
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
  function finish() {
    if (state.phase === "idle") return;
    detach();
    const transcript = state.transcript.trim();
    dispatch({ type: "end" });
    if (transcript) callbacks.complete(transcript);
    else callbacks.error("no-speech");
  }
  function stop() {
    if (state.phase === "idle" || state.phase === "stopping") return;
    dispatch({ type: "stop" });
    clearTimeout(timer);
    const instance = recognition;
    if (!instance) return finish();
    try {
      instance.stop();
      // Permission-pending engines may omit onend after stop().
      if (recognition === instance)
        timer = setTimeout(() => {
          finish();
          instance.abort();
        }, 1500);
    } catch (error) {
      console.warn("speech_stop_failed", error instanceof Error ? error.name : "Unknown");
      finish();
      instance.abort();
    }
  }
  function listen() {
    let receivedText = false;
    try {
      const instance = new Constructor();
      recognition = instance;
      instance.lang = language;
      instance.continuous = true;
      instance.interimResults = true;
      instance.onstart = () => {
        if (recognition !== instance) return;
        if (state.phase === "stopping") {
          try {
            instance.stop();
          } catch (error) {
            console.warn("speech_stop_failed", error instanceof Error ? error.name : "Unknown");
            finish();
            instance.abort();
          }
          return;
        }
        dispatch({ type: "listening" });
        timer = setTimeout(stop, 10_000);
      };
      instance.onresult = (event) => {
        if (recognition !== instance) return;
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ")
          .trim();
        receivedText = Boolean(transcript);
        if (transcript && state.phase !== "stopping") clearTimeout(timer);
        dispatch({ type: "result", transcript });
        callbacks.interim(state.transcript);
      };
      instance.onerror = ({ error }) => {
        if (recognition === instance) fail(error);
      };
      instance.onend = () => {
        if (recognition !== instance) return;
        if (state.phase !== "listening" || !receivedText) return finish();
        detach();
        dispatch({ type: "restart" });
        // Safari can end despite continuous=true; wait for its previous session to release.
        timer = setTimeout(listen, 150);
      };
      instance.start();
    } catch (error) {
      fail(
        error instanceof Error && error.name === "NotAllowedError" ? "not-allowed" : "start-failed",
      );
    }
  }
  function start() {
    if (state.phase !== "idle") return;
    dispatch({ type: "start" });
    listen();
  }
  function cancel() {
    const instance = detach();
    dispatch({ type: "end" });
    instance?.abort();
  }
  return { start, stop, cancel };
}
