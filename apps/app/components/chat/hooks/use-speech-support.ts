import type { SpeechBrowser } from "./use-speech-session.ts";

export function speechConstructor(browser: SpeechBrowser & { isSecureContext: boolean }) {
  if (!browser.isSecureContext) return null;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}
