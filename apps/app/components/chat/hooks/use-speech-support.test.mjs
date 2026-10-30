import { describe, expect, it } from "vitest";
import { speechConstructor } from "./use-speech-support.ts";

describe("speech browser support", () => {
  const Standard = class {};
  const Prefixed = class {};
  it("prefers the standard constructor", () => {
    expect(
      speechConstructor({
        isSecureContext: true,
        SpeechRecognition: Standard,
        webkitSpeechRecognition: Prefixed,
      }),
    ).toBe(Standard);
  });
  it("supports the Chrome and Safari prefixed constructor", () => {
    expect(speechConstructor({ isSecureContext: true, webkitSpeechRecognition: Prefixed })).toBe(
      Prefixed,
    );
  });
  it("hides voice in unsupported browsers and insecure contexts", () => {
    expect(speechConstructor({ isSecureContext: true })).toBeNull();
    expect(speechConstructor({ isSecureContext: false, SpeechRecognition: Standard })).toBeNull();
  });
});
