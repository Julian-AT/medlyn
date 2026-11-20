import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { llmApiKey, llmBaseUrl, usesGemini, usesOfficialOpenAI } from "@medlyn/engine/llm/client";
import { type ChatModel, withFallback } from "./fallback-model";

/**
 * Gemini streams through its native provider: the OpenAI-compatible stream omits tool-call
 * indexes and drops the thought signatures that multi-step tool calls must return.
 */
function providerFor(): (model: string) => ChatModel {
  if (usesGemini()) {
    const google = createGoogleGenerativeAI({ apiKey: llmApiKey() });
    return (model) => google(model);
  }
  const openai = createOpenAI({ baseURL: llmBaseUrl(), apiKey: llmApiKey() });
  return (model) => openai.chat(model);
}

export function chatModel(model: string): ChatModel {
  const create = providerFor();
  const fallback = process.env.MODEL_FAST_FALLBACK;
  return withFallback(create(model), fallback && fallback !== model ? create(fallback) : null);
}

export function chatProviderOptions() {
  return usesOfficialOpenAI()
    ? { openai: { reasoningEffort: "none" as const, store: false } }
    : undefined;
}
