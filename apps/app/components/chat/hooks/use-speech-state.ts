export type SpeechState = {
  phase: "idle" | "starting" | "listening" | "stopping";
  transcript: string;
  committedTranscript: string;
  error: string | null;
};
export type SpeechAction =
  | { type: "start" }
  | { type: "restart" }
  | { type: "listening" }
  | { type: "result"; transcript: string }
  | { type: "stop" }
  | { type: "end" }
  | { type: "error"; error: string };

export const initialSpeechState: SpeechState = {
  phase: "idle",
  transcript: "",
  committedTranscript: "",
  error: null,
};

export function speechReducer(state: SpeechState, action: SpeechAction): SpeechState {
  switch (action.type) {
    case "start":
      return state.phase === "idle" ? { ...initialSpeechState, phase: "starting" } : state;
    case "restart":
      return state.phase === "listening"
        ? { ...state, phase: "starting", committedTranscript: state.transcript }
        : state;
    case "listening":
      return state.phase === "starting" ? { ...state, phase: "listening" } : state;
    case "result":
      return state.phase === "idle"
        ? state
        : { ...state, transcript: appendDictation(state.committedTranscript, action.transcript) };
    case "stop":
      return state.phase === "idle" ? state : { ...state, phase: "stopping" };
    case "end":
      return { ...state, phase: "idle" };
    case "error":
      return { ...state, phase: "idle", error: action.error };
  }
}

export function speechLanguage(language: string): "de-DE" | "en-US" {
  return /^de(?:-|$)/i.test(language) ? "de-DE" : "en-US";
}

export function speechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access denied. Allow microphone access for this site in browser settings, then try again. In Safari, also enable Siri and Dictation in system settings.";
    case "insecure-context":
      return "Voice input needs a secure connection. Open Medlyn over HTTPS or localhost.";
    case "audio-capture":
      return "No microphone available. Connect a microphone and try again.";
    case "no-speech":
      return "No speech heard. Try again and speak after the microphone is ready.";
    case "network":
      return "Speech recognition couldn't connect. Check your connection and try again.";
    case "language-not-supported":
      return "This dictation language isn't available. Try English or German.";
    default:
      return "Voice input interrupted. Try again or type your question.";
  }
}

export function appendDictation(base: string, transcript: string): string {
  return `${base}${base && transcript && !/\s$/.test(base) ? " " : ""}${transcript}`;
}
