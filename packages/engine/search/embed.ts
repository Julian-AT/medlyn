import { setTimeout as delay } from "node:timers/promises";

export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIM = 768;
export type EmbeddingTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
export type EmbeddingPart =
  | { text: string }
  | { inlineData: { mimeType: "image/png" | "image/jpeg" | "application/pdf"; data: string } }
  | { fileData: { mimeType: string; fileUri: string } };
export type EmbeddingInput = string | { parts: EmbeddingPart[]; title?: string };
export type EmbedOptions = {
  task?: EmbeddingTask;
  batchSize?: number;
  concurrency?: number;
  retries?: number;
  timeoutMs?: number;
  apiKey?: string;
  requestsPerMinute?: number;
};

const reservations: number[] = [];

async function reserveBatch(size: number, limit: number, maxWaitMs: number) {
  const started = Date.now();
  for (;;) {
    const now = Date.now();
    while (reservations.length && reservations[0] <= now - 60_000) reservations.shift();
    if (reservations.length + size <= limit) {
      reservations.push(...Array<number>(size).fill(now));
      return;
    }
    const waitMs = reservations[reservations.length + size - limit - 1] + 60_050 - now;
    if (Date.now() - started + waitMs > maxWaitMs) {
      throw new Error("Embedding rate budget is busy; using BM25-only search");
    }
    await delay(waitMs);
  }
}

export function normaliseEmbedding(values: number[]): number[] {
  if (values.length !== EMBEDDING_DIM || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`Expected ${EMBEDDING_DIM} finite embedding values`);
  }
  const norm = Math.hypot(...values);
  if (!norm) throw new Error("Embedding has zero length");
  return values.map((value) => value / norm);
}

export function embeddingContent(input: EmbeddingInput, task: EmbeddingTask) {
  const parts = typeof input === "string" ? [{ text: input }] : input.parts;
  if (parts.some((part) => !("text" in part))) return { parts };
  const text = parts.map((part) => ("text" in part ? part.text : "")).join("\n");
  const formatted =
    task === "RETRIEVAL_QUERY"
      ? `task: search result | query: ${text}`
      : `title: ${typeof input === "string" ? "none" : (input.title ?? "none")} | text: ${text}`;
  return { parts: [{ text: formatted }] };
}

/** Returns null when credentials are absent; transport and response failures remain explicit. */
export async function embed(
  inputs: EmbeddingInput[],
  opts: EmbedOptions = {},
): Promise<number[][] | null> {
  const apiKey = opts.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.info("embedding_skipped", { reason: "GEMINI_API_KEY is not set; BM25-only search" });
    return null;
  }
  if (!inputs.length) return [];
  const requestLimit =
    opts.requestsPerMinute ?? Number(process.env.GEMINI_EMBED_REQUESTS_PER_MINUTE ?? 80);
  if (!Number.isSafeInteger(requestLimit) || requestLimit < 1)
    throw new Error("Invalid embedding request budget");
  if (
    opts.batchSize !== undefined &&
    (!Number.isSafeInteger(opts.batchSize) || opts.batchSize < 1)
  ) {
    throw new Error("Invalid embedding batch size");
  }
  if (
    opts.concurrency !== undefined &&
    (!Number.isSafeInteger(opts.concurrency) || opts.concurrency < 1)
  ) {
    throw new Error("Invalid embedding concurrency");
  }
  const batchSize = Math.max(1, Math.min(100, requestLimit, opts.batchSize ?? 32));
  const concurrency = Math.max(1, Math.min(8, Math.floor(opts.concurrency ?? 3)));
  const batches = Array.from({ length: Math.ceil(inputs.length / batchSize) }, (_, i) =>
    inputs.slice(i * batchSize, (i + 1) * batchSize),
  );
  const output: number[][][] = new Array(batches.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, batches.length) }, async () => {
      while (cursor < batches.length) {
        const index = cursor++;
        const requests = batches[index].map((input) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: embeddingContent(input, opts.task ?? "RETRIEVAL_DOCUMENT"),
          outputDimensionality: EMBEDDING_DIM,
        }));
        for (let attempt = 0; ; attempt++) {
          try {
            await reserveBatch(
              requests.length,
              requestLimit,
              opts.task === "RETRIEVAL_QUERY" ? (opts.timeoutMs ?? 4000) : Infinity,
            );
            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body: JSON.stringify({ requests }),
                signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
              },
            );
            if (!response.ok) {
              if (response.status !== 429 && response.status < 500) {
                throw new PermanentError(`Gemini embedding HTTP ${response.status}`);
              }
              const body = (await response.json()) as {
                error?: { details?: { retryDelay?: string }[] };
              };
              const retryDelay = body.error?.details?.find(
                (detail) => detail.retryDelay,
              )?.retryDelay;
              const header = Number(response.headers.get("retry-after") ?? 0);
              const retryMs = retryDelay ? Number.parseFloat(retryDelay) * 1000 : header * 1000;
              const error = new RetryableError(`Gemini embedding HTTP ${response.status}`);
              error.retryAfterMs = Number.isFinite(retryMs) ? Math.max(0, retryMs) : 0;
              throw error;
            }
            const result = (await response.json()) as { embeddings?: { values: number[] }[] };
            if (result.embeddings?.length !== requests.length)
              throw new Error("Embedding count mismatch");
            output[index] = result.embeddings.map(({ values }) => normaliseEmbedding(values));
            break;
          } catch (error) {
            if (error instanceof PermanentError || attempt >= (opts.retries ?? 2)) throw error;
            await delay(
              Math.max(
                1000 * 2 ** attempt,
                error instanceof RetryableError ? error.retryAfterMs : 0,
              ),
            );
          }
        }
      }
    }),
  );
  return output.flat();
}

class PermanentError extends Error {}

class RetryableError extends Error {
  retryAfterMs = 0;
}
