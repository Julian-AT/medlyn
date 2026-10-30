import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type ValidationContext, validateClaims } from "../claims/validate.ts";
import type { Claim, Segment } from "../contracts.ts";
import { structured } from "../llm/client.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("shared model request budget", () => {
  it.each([undefined, "0", "invalid"])("uses the default budget for %s", async (configured) => {
    vi.stubEnv("MODEL_FAST", "synthetic-fast");
    vi.stubEnv("MEDLYN_LLM_CONCURRENCY", configured);
    let active = 0;
    let peak = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active--;
        return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }));
      }),
    );
    await Promise.all(
      Array.from({ length: 20 }, () =>
        structured("fast", "synthetic", z.object({ ok: z.boolean() }), []),
      ),
    );
    expect(peak).toBe(8);
  });

  it("bounds simultaneous semantic checks and other model roles together", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic-fast");
    vi.stubEnv("MODEL_REASONING", "synthetic-reasoning");
    vi.stubEnv("MEDLYN_LLM_CONCURRENCY", "3");
    vi.stubEnv("DATABASE_URL", "");
    let active = 0;
    let peak = 0;
    const request = vi.fn(async (_url: unknown, init: RequestInit) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      const body = JSON.parse(String(init.body));
      const result =
        body.response_format.json_schema.name === "claim_support"
          ? { support: "supported", negationFlag: false, reason: "Synthetic" }
          : { ok: true };
      return new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }),
      );
    });
    vi.stubGlobal("fetch", request);
    const segment: Segment = {
      id: "s",
      documentId: "d",
      kind: "sentence",
      section: null,
      text: "Synthetic evidence.",
      textEn: null,
      start: 0,
      end: 19,
    };
    const ctx: ValidationContext = {
      patientId: "p",
      facts: [],
      segments: [segment],
      window: { asOf: "2025-01-01", corpusRevision: "r", eligibleDocumentIds: ["d"] },
    };
    const claims: Claim[] = Array.from({ length: 20 }, (_, index) => ({
      id: `c-${index}`,
      kind: "composed",
      text: `Synthetic evidence ${String.fromCharCode(65 + index)}`,
      factIds: [],
      segmentIds: ["s"],
      author: "machine",
      validation: { key: "", support: "unsupported" },
    }));
    const [checked] = await Promise.all([
      validateClaims(claims, ctx),
      ...Array.from({ length: 7 }, () =>
        structured("reasoning", "synthetic", z.object({ ok: z.boolean() }), []),
      ),
    ]);
    expect(checked.every((claim) => claim.validation.support === "supported")).toBe(true);
    expect(request).toHaveBeenCalledTimes(27);
    expect(peak).toBe(3);
    expect(active).toBe(0);
  });

  it("releases the single slot after network failure and structured-output retry", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic-fast");
    vi.stubEnv("MEDLYN_LLM_CONCURRENCY", "1");
    let count = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        count++;
        if (count === 1) throw new Error("Synthetic failure");
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: count === 2 ? "invalid" : JSON.stringify({ ok: true }),
                },
              },
            ],
          }),
        );
      }),
    );
    const schema = z.object({ ok: z.boolean() });
    const results = await Promise.allSettled([
      structured("fast", "first", schema, []),
      structured("fast", "second", schema, []),
      structured("fast", "third", schema, []),
    ]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled", "fulfilled"]);
    expect(count).toBe(4);
  });
});
