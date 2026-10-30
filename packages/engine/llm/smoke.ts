const BASE = process.env.OPENAI_BASE_URL ?? "http://localhost:8317/v1";
const KEY = process.env.OPENAI_API_KEY ?? "";
const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

type Result = { model: string; check: string; ok: boolean; ms: number; note: string };
const results: Result[] = [];

async function timed(model: string, check: string, fn: () => Promise<string>) {
  const t0 = performance.now();
  try {
    const note = await fn();
    results.push({ model, check, ok: true, ms: Math.round(performance.now() - t0), note });
  } catch (e) {
    const note = e instanceof Error ? e.message.slice(0, 120) : String(e);
    results.push({ model, check, ok: false, ms: Math.round(performance.now() - t0), note });
  }
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

async function chat(model: string) {
  const res = await post("/chat/completions", {
    model,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
  });
  const json = await res.json();
  return json.choices[0].message.content.trim();
}

async function jsonSchema(model: string) {
  const res = await post("/chat/completions", {
    model,
    messages: [{ role: "user", content: 'Extract: "Thrombo ASS 100 mg 1-0-0"' }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "med",
        strict: true,
        schema: {
          type: "object",
          properties: { brand: { type: "string" }, strengthMg: { type: "number" } },
          required: ["brand", "strengthMg"],
          additionalProperties: false,
        },
      },
    },
  });
  const parsed = JSON.parse((await res.json()).choices[0].message.content);
  if (parsed.strengthMg !== 100) throw new Error(`unexpected ${JSON.stringify(parsed)}`);
  return JSON.stringify(parsed);
}

async function toolCall(model: string) {
  const res = await post("/chat/completions", {
    model,
    messages: [{ role: "user", content: "Look up segment s-42." }],
    tools: [
      {
        type: "function",
        function: {
          name: "get_passage",
          parameters: {
            type: "object",
            properties: { segmentId: { type: "string" } },
            required: ["segmentId"],
          },
        },
      },
    ],
    tool_choice: "required",
  });
  const call = (await res.json()).choices[0].message.tool_calls?.[0];
  if (!call) throw new Error("no tool call returned");
  return `${call.function.name}(${call.function.arguments})`;
}

async function stream(model: string) {
  const t0 = performance.now();
  const res = await post("/chat/completions", {
    model,
    stream: true,
    messages: [{ role: "user", content: "Count from 1 to 10, comma separated." }],
  });
  const reader = res.body!.getReader();
  let firstMs = 0;
  let chunks = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!firstMs) firstMs = Math.round(performance.now() - t0);
    chunks += new TextDecoder().decode(value).split("data:").length - 1;
  }
  if (chunks < 2) throw new Error("response was not streamed");
  return `first chunk ${firstMs} ms, ${chunks} events`;
}

function silentWav(seconds = 1, rate = 16000) {
  const samples = seconds * rate;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}

async function transcribe(model: string) {
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([silentWav()], { type: "audio/wav" }), "silence.wav");
  const res = await fetch(`${BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return `text: ${JSON.stringify((await res.json()).text)}`;
}

const listed = await fetch(`${BASE}/models`, { headers });
if (!listed.ok) {
  console.error(`Cannot reach ${BASE}/models: ${listed.status} ${await listed.text()}`);
  process.exit(1);
}
const available: string[] = (await listed.json()).data.map((m: { id: string }) => m.id);
console.log(`Proxy at ${BASE} lists ${available.length} models:\n  ${available.join("\n  ")}\n`);

const textModels = [
  ...new Set(
    [process.env.MODEL_REASONING, process.env.MODEL_FAST, ...process.argv.slice(2)].filter(
      (m): m is string => Boolean(m),
    ),
  ),
];
if (textModels.length === 0) {
  console.error("Set MODEL_REASONING / MODEL_FAST in .env or pass model ids as arguments.");
  process.exit(1);
}

await Promise.all(
  textModels.flatMap((m) => [
    timed(m, "chat", () => chat(m)),
    timed(m, "json_schema", () => jsonSchema(m)),
    timed(m, "tool_call", () => toolCall(m)),
    timed(m, "stream", () => stream(m)),
  ]),
);
if (process.env.MODEL_STT) {
  const stt = process.env.MODEL_STT;
  await timed(stt, "transcription", () => transcribe(stt));
}

console.table(results.map(({ model, check, ok, ms, note }) => ({ model, check, ok, ms, note })));
process.exit(results.every((r) => r.ok) ? 0 : 1);
