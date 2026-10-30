import { z } from "zod";

export type ModelRole = "reasoning" | "fast";
export type Message = { role: "system" | "user" | "assistant"; content: string };

const ROLE_ENV = { reasoning: "MODEL_REASONING", fast: "MODEL_FAST" } as const;
let active = 0;
const waiting: (() => void)[] = [];

function concurrency(): number {
  const value = Number(process.env.MEDLYN_LLM_CONCURRENCY ?? 8);
  return Number.isSafeInteger(value) && value > 0 ? value : 8;
}

async function withRequestSlot<T>(run: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    waiting.push(resolve);
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
  while (active < concurrency() && waiting.length) {
    active++;
    waiting.shift()!();
  }
}

export function modelFor(role: ModelRole): string {
  const model = process.env[ROLE_ENV[role]];
  if (!model) throw new Error(`${ROLE_ENV[role]} is not set`);
  return model;
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
      const url = `${process.env.OPENAI_BASE_URL ?? "http://localhost:8317/v1"}/chat/completions`;
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
      return json.choices[0].message.content as string;
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
    const content = await complete(model, messages, { response_format }, timeoutMs, name);
    try {
      return schema.parse(JSON.parse(content));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`LLM ${name}: invalid structured output`, { cause: lastError });
}
