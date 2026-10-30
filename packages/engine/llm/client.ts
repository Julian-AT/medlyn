import { z } from "zod";

export type ModelRole = "reasoning" | "fast";
export type Message = { role: "system" | "user" | "assistant"; content: string };

const ROLE_ENV = { reasoning: "MODEL_REASONING", fast: "MODEL_FAST" } as const;

export function modelFor(role: ModelRole): string {
  const model = process.env[ROLE_ENV[role]];
  if (!model) throw new Error(`${ROLE_ENV[role]} is not set`);
  return model;
}

async function complete(model: string, messages: Message[], body: object, timeoutMs: number) {
  const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "http://localhost:8317/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, ...body }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  return json.choices[0].message.content as string;
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
    const content = await complete(model, messages, { response_format }, timeoutMs);
    try {
      return schema.parse(JSON.parse(content));
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`LLM ${name}: invalid structured output`, { cause: lastError });
}
