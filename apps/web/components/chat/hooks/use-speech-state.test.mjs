import { describe, expect, it } from "vitest";
import {
  appendDictation,
  initialSpeechState,
  speechErrorMessage,
  speechLanguage,
  speechReducer,
} from "./use-speech-state.ts";

describe("dictation state", () => {
  it("streams replacement hypotheses and retains editable text after stop", () => {
    let state = speechReducer(initialSpeechState, { type: "start" });
    expect(state.phase).toBe("starting");
    state = speechReducer(state, { type: "listening" });
    state = speechReducer(state, { type: "result", transcript: "check" });
    state = speechReducer(state, { type: "result", transcript: "check medication" });
    expect(state.transcript).toBe("check medication");
    state = speechReducer(state, { type: "stop" });
    state = speechReducer(state, { type: "listening" });
    expect(state.phase).toBe("stopping");
    expect(speechReducer(state, { type: "end" })).toEqual({
      phase: "idle",
      transcript: "check medication",
      error: null,
    });
  });
  it("ignores late results and allows retry after permission failure", () => {
    expect(speechReducer(initialSpeechState, { type: "result", transcript: "late" })).toBe(
      initialSpeechState,
    );
    const failed = speechReducer(initialSpeechState, { type: "error", error: "not-allowed" });
    expect(speechReducer(failed, { type: "start" })).toEqual({
      phase: "starting",
      transcript: "",
      error: null,
    });
  });
  it("does not append every interim hypothesis", () => {
    expect(appendDictation("Existing question", "check")).toBe("Existing question check");
    expect(appendDictation("Existing question", "check medication")).toBe(
      "Existing question check medication",
    );
    expect(appendDictation("", "hello")).toBe("hello");
    expect(appendDictation("Question\n", "hello")).toBe("Question\nhello");
  });
  it.each([
    ["de-AT", "de-AT"],
    ["de-DE", "de-DE"],
    ["en-US", "en-US"],
    ["fr-FR", "en-GB"],
  ])("selects a language for %s", (input, output) => {
    expect(speechLanguage(input)).toBe(output);
  });
  it("provides actionable permission and no-speech errors", () => {
    expect(speechErrorMessage("not-allowed")).toContain("browser settings");
    expect(speechErrorMessage("no-speech")).toContain("No speech heard");
    expect(speechErrorMessage("audio-capture")).toContain("microphone");
  });
});
