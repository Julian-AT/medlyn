import { llmErrorDetails } from "@medlyn/engine/llm/client";
import { APICallError, wrapLanguageModel } from "ai";

export type ChatModel = ReturnType<typeof wrapLanguageModel>;

/** Overload, quota, server and transport failures may succeed on another model; 4xx may not. */
export function fallbackEligible(error: unknown): boolean {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode;
    return status === undefined || status === 429 || status >= 500;
  }
  return error instanceof Error && error.name !== "AbortError";
}

/** Starts the stream on the fallback model when the primary cannot serve the request. */
export function withFallback(primary: ChatModel, fallback: ChatModel | null): ChatModel {
  if (!fallback) return primary;
  return wrapLanguageModel({
    model: primary,
    middleware: {
      wrapStream: async ({ doStream, params }) => {
        try {
          return await doStream();
        } catch (error) {
          if (params.abortSignal?.aborted || !fallbackEligible(error)) throw error;
          console.warn("chat_model_fallback", llmErrorDetails(error));
          return fallback.doStream(params);
        }
      },
    },
  });
}
