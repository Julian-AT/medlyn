import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { llmErrorDetails, structured, usesOfficialOpenAI } from "../llm/client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function configure() {
  vi.stubEnv("MODEL_FAST", "synthetic-fast");
  vi.stubEnv("MODEL_REASONING", "synthetic-reasoning");
  vi.spyOn(console, "warn").mockImplementation(() => {});
}

function completion(content: unknown, rest = {}) {
  return Response.json({ choices: [{ message: { content }, ...rest }] });
}

describe("structured provider compatibility", () => {
  it.each(["https://api.openai.com/v1", "http://localhost:8317/v1/"])(
    "sends strict schemas without unsupported sampling parameters to %s",
    async (base) => {
      configure();
      vi.stubEnv("OPENAI_BASE_URL", base);
      const fetcher = vi.fn(async () => completion('{"ok":true,"details":null}'));
      vi.stubGlobal("fetch", fetcher);
      const schema = z.object({
        ok: z.boolean(),
        details: z.object({ text: z.string() }).nullable(),
      });
      expect(await structured("fast", "probe", schema, [])).toEqual({ ok: true, details: null });
      const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(`${base.replace(/\/+$/, "")}/chat/completions`);
      const body = JSON.parse(String(init.body));
      expect(body.temperature).toBeUndefined();
      expect(body.max_tokens).toBeUndefined();
      expect(body.reasoning_effort).toBe(base.includes("api.openai.com") ? "none" : undefined);
      expect(body.response_format.json_schema).toMatchObject({
        strict: true,
        schema: { additionalProperties: false, required: ["ok", "details"] },
      });
    },
  );

  it("preserves the reasoning role's provider defaults", async () => {
    configure();
    vi.stubEnv("OPENAI_BASE_URL", "https://api.openai.com/v1");
    const fetcher = vi.fn(async () => completion('{"ok":true}'));
    vi.stubGlobal("fetch", fetcher);
    await structured("reasoning", "probe", z.object({ ok: z.boolean() }), []);
    const [, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).not.toHaveProperty("reasoning_effort");
  });

  it("retries malformed structured output once", async () => {
    configure();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(completion("invalid"))
        .mockResolvedValueOnce(completion('{"ok":true}')),
    );
    expect(await structured("fast", "probe", z.object({ ok: z.boolean() }), [])).toEqual({
      ok: true,
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    { choices: [{ message: { refusal: "Synthetic refusal", content: null } }] },
    { choices: [{ finish_reason: "length", message: { content: '{"ok":' } }] },
    { choices: [] },
  ])(
    "rejects refusals, truncation and empty responses without parsing them as evidence",
    async (payload) => {
      configure();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(payload)),
      );
      await expect(structured("fast", "probe", z.object({ ok: z.boolean() }), [])).rejects.toThrow(
        /refused|truncated|missing structured response/,
      );
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("logs provider error names and messages while redacting credentials", async () => {
    configure();
    vi.stubEnv("OPENAI_API_KEY", "synthetic-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("Unsupported parameter with synthetic-secret", { status: 400 }),
      ),
    );
    await expect(structured("fast", "probe", z.object({ ok: z.boolean() }), [])).rejects.toThrow(
      "LLM 400",
    );
    expect(console.warn).toHaveBeenCalledWith(
      "llm_request_failed",
      expect.objectContaining({
        name: "Error",
        message: "LLM 400: Unsupported parameter with [redacted]",
      }),
    );
  });

  it("never logs request bodies and redacts both key slots and bearer tokens", () => {
    vi.stubEnv("OPENAI_API_KEY", "local-key");
    vi.stubEnv("OPENAI_API_KEY_PROD", "prod-key");
    expect(llmErrorDetails(new Error("local-key prod-key Bearer secret sk-secret"))).toEqual({
      name: "Error",
      message: "[redacted] [redacted] [redacted] [redacted]",
    });
  });

  it.each([
    ["https://api.openai.com/v1/", true],
    ["http://localhost:8317/v1", false],
    ["https://api.openai.com.example.test/v1", false],
    ["invalid", false],
  ])("identifies the official endpoint %s", (base, expected) => {
    vi.stubEnv("OPENAI_BASE_URL", base);
    expect(usesOfficialOpenAI()).toBe(expected);
  });
});
