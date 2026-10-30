import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";

export type ModelRole = "reasoning" | "fast";
export type Message = { role: "system" | "user" | "assistant"; content: string };

const ROLE_ENV = { reasoning: "MODEL_REASONING", fast: "MODEL_FAST" } as const;
let active = 0;
const waiting: { resolve: () => void; lens: boolean; limit: number }[] = [];
const priority = new AsyncLocalStorage<boolean>();

export function withLensPriority<T>(run: () => T): T {
  return priority.run(true, run);
}

function concurrency(): number {
  const fallback = priority.getStore() ? 16 : 8;
  const value = Number(process.env.MEDLYN_LLM_CONCURRENCY ?? fallback);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

async function withRequestSlot<T>(run: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    const entry = { resolve, lens: priority.getStore() === true, limit: concurrency() };
    const background = entry.lens ? waiting.findIndex((job) => !job.lens) : -1;
    if (background < 0) waiting.push(entry);
    else waiting.splice(background, 0, entry);
    drain();
  });
  try {
    return await run();
  } finally {
    active--;
    drain();
  }
}

function drain(): void {
  while (waiting.length && active < waiting[0].limit) {
    const next = waiting.shift();
    if (!next) return;
    active++;
    next.resolve();
  }
}

export function modelFor(role: ModelRole): string {
  const model = process.env[ROLE_ENV[role]];
  if (!model) throw new Error(`${ROLE_ENV[role]} is not set`);
  return model;
}

export function usesOfficialOpenAI(): boolean {
  try {
    return (
      new URL(process.env.OPENAI_BASE_URL ?? "http://localhost:8317/v1").hostname ===
      "api.openai.com"
    );
  } catch {
    return false;
  }
}

/** Log only diagnostic fields, never provider request bodies or credentials. */
export function llmErrorDetails(error: unknown): { name: string; message: string } {
  let message = error instanceof Error ? error.message : "Unknown error";
  for (const key of [process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY_PROD]) {
    if (key) message = message.replaceAll(key, "[redacted]");
  }
  return {
    name: error instanceof Error ? error.name : "Unknown",
    message: message.replace(/Bearer\s+\S+|sk-[\w-]+/gi, "[redacted]").slice(0, 1000),
  };
}

async function complete(
  model: string,
  messages: Message[],
  body: object,
  timeoutMs: number,
  name: string,
) {
  const queued = performance.now();
  return withRequestSlot(async () => {
    const started = performance.now();
    let status: number | undefined;
    try {
      const base = (process.env.OPENAI_BASE_URL ?? "http://localhost:8317/v1").replace(/\/+$/, "");
      const url = `${base}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model, messages, ...body }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      status = res.status;
      if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      const choice = json.choices?.[0];
      if (choice?.message?.refusal)
        throw new StructuredOutputError(`LLM ${name}: structured response refused`);
      if (choice?.finish_reason === "length")
        throw new StructuredOutputError(`LLM ${name}: structured response truncated`);
      const content: unknown = choice?.message?.content;
      if (typeof content !== "string" || !content.trim())
        throw new StructuredOutputError(`LLM ${name}: missing structured response`);
      return content;
    } catch (error) {
      console.warn("llm_request_failed", { operation: name, status, ...llmErrorDetails(error) });
      throw error;
    } finally {
      if (process.env.MEDLYN_PROFILE_LENS === "1") {
        console.info("llm_timing", {
          name,
          queueMs: Math.round(started - queued),
          requestMs: Math.round(performance.now() - started),
          status,
          concurrency: concurrency(),
        });
      }
    }
  });
}

/**
 * One JSON-schema call validated with Zod; a malformed or invalid response is retried once.
 * Use `.nullable()` instead of `.optional()` in `schema`: strict mode requires every key.
 */
export async function structured<T extends z.ZodType>(
  role: ModelRole,
  name: string,
  schema: T,
  messages: Message[],
  { timeoutMs = 30_000 }: { timeoutMs?: number } = {},
): Promise<z.infer<T>> {
  const model = modelFor(role);
  const response_format = {
    type: "json_schema",
    json_schema: { name, strict: true, schema: z.toJSONSchema(schema, { target: "draft-7" }) },
  };
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = await complete(
      model,
      messages,
      {
        response_format,
        ...(role === "fast" && usesOfficialOpenAI() ? { reasoning_effort: "none" } : {}),
      },
      timeoutMs,
      name,
    );
    try {
      return schema.parse(JSON.parse(content));
    } catch (error) {
      lastError = error;
    }
  }
  throw new StructuredOutputError(`LLM ${name}: invalid structured output`, { cause: lastError });
}

export class StructuredOutputError extends Error {}
