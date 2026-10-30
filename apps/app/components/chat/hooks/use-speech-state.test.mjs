import { describe, expect, it } from "vitest";
import {
  appendDictation,
  initialSpeechState,
  speechErrorMessage,
  speechLanguage,
  speechReducer,
} from "./use-speech-state.ts";

function listening() {
  return speechReducer(speechReducer(initialSpeechState, { type: "start" }), { type: "listening" });
}

describe("dictation state", () => {
  it("replaces interim hypotheses and retains text after stopping", () => {
    let state = listening();
    state = speechReducer(state, { type: "result", transcript: "check" });
    state = speechReducer(state, { type: "result", transcript: "check medication" });
    expect(state.transcript).toBe("check medication");
    state = speechReducer(state, { type: "stop" });
    expect(speechReducer(state, { type: "listening" })).toBe(state);
    expect(speechReducer(state, { type: "end" })).toMatchObject({
      phase: "idle",
      transcript: "check medication",
      error: null,
    });
  });
  it("keeps previous browser sessions while replacing only the new hypothesis", () => {
    let state = speechReducer(listening(), { type: "result", transcript: "first sentence" });
    state = speechReducer(state, { type: "restart" });
    expect(state.phase).toBe("starting");
    state = speechReducer(state, { type: "listening" });
    state = speechReducer(state, { type: "result", transcript: "next" });
    state = speechReducer(state, { type: "result", transcript: "next sentence" });
    expect(state.transcript).toBe("first sentence next sentence");
    expect(state.committedTranscript).toBe("first sentence");
  });
  it("ignores late results and clears old text and errors on retry", () => {
    expect(speechReducer(initialSpeechState, { type: "result", transcript: "late" })).toBe(
      initialSpeechState,
    );
    const failed = speechReducer(listening(), { type: "error", error: "not-allowed" });
    expect(speechReducer(failed, { type: "start" })).toEqual({
      ...initialSpeechState,
      phase: "starting",
    });
    expect(speechReducer(failed, { type: "restart" })).toBe(failed);
  });
  it("ignores duplicate starts and restarts after explicit stop", () => {
    const state = listening();
    expect(speechReducer(state, { type: "start" })).toBe(state);
    const stopped = speechReducer(state, { type: "stop" });
    expect(speechReducer(stopped, { type: "restart" })).toBe(stopped);
  });
  it("appends to the existing draft without accumulating interim hypotheses", () => {
    expect(appendDictation("Existing question", "check")).toBe("Existing question check");
    expect(appendDictation("Existing question", "check medication")).toBe(
      "Existing question check medication",
    );
    expect(appendDictation("", "hello")).toBe("hello");
    expect(appendDictation("Question\n", "hello")).toBe("Question\nhello");
    expect(appendDictation("Question", "")).toBe("Question");
  });
  it.each([
    ["de-AT", "de-DE"],
    ["de-DE", "de-DE"],
    ["de", "de-DE"],
    ["en-US", "en-US"],
    ["en-GB", "en-US"],
    ["fr-FR", "en-US"],
  ])("selects a supported dictation language for %s", (input, output) => {
    expect(speechLanguage(input)).toBe(output);
  });
  it("provides actionable permission, connection and no-speech errors", () => {
    expect(speechErrorMessage("not-allowed")).toContain("browser settings");
    expect(speechErrorMessage("service-not-allowed")).toContain("Safari");
    expect(speechErrorMessage("insecure-context")).toContain("HTTPS or localhost");
    expect(speechErrorMessage("no-speech")).toContain("No speech heard");
    expect(speechErrorMessage("network")).toContain("connection");
    expect(speechErrorMessage("audio-capture")).toContain("microphone");
  });
});
