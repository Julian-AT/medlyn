import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { requestCacheKey } from "../lens/cache.ts";
import { CHIPS } from "../lens/needs/profiles.ts";
import { parseAndPlan } from "../lens/parse-plan.ts";
import { structured, withLensPriority } from "../llm/client.ts";

const parsed = {
  role: "GP",
  task: "Diabetes review",
  setting: null,
  procedure: null,
  procedureDate: null,
  asOf: null,
  concerns: [],
  profileId: "gp_diabetes",
  sections: [],
};
const response = (value: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(value) } }],
    }),
  );

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("typed planning round trips", () => {
  it("parses and plans typed input in one call while preserving an explicit cutoff", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic");
    const fetch = vi.fn(async () =>
      response({ ...parsed, asOf: "2020-01-01", procedureDate: "2020-03-01" }),
    );
    vi.stubGlobal("fetch", fetch);
    const result = await parseAndPlan(
      "GP review as of 2020-01-01",
      undefined,
      undefined,
      "2020-02-01",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.situation.asOf).toBe("2020-01-01");
    expect(result.situation.procedureDate).toBe("2020-03-01");
    expect(
      result.planned.sections.flatMap((section) => section.needs.map((need) => need.id)),
    ).toContain("hba1c");
  });

  it("keeps critical needs in their own section for a composed situation", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic");
    vi.stubGlobal("fetch", async () =>
      response({
        ...parsed,
        role: "Synthetic clinician",
        task: "Synthetic task",
        profileId: null,
        sections: [{ needIds: ["allergies", "antithrombotics", "kidney_function"] }],
      }),
    );
    const { planned } = await parseAndPlan(
      "Synthetic clinician task",
      undefined,
      undefined,
      "2020-02-01",
    );
    expect(
      planned.sections.find((section) => section.id === "critical")?.needs.map((need) => need.id),
    ).toEqual(["allergies", "antithrombotics"]);
    expect(
      planned.sections.find((section) => section.id === "composed-1")?.needs.map((need) => need.id),
    ).toEqual(["kidney_function"]);
  });

  it("falls back only after invalid structured output, preserving the old parser", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic");
    let calls = 0;
    vi.stubGlobal("fetch", async () => response(++calls < 3 ? {} : parsed));
    const result = await parseAndPlan("GP review", undefined, undefined, "2020-02-01");
    expect(calls).toBe(3);
    expect(result.situation.profileId).toBe("gp_diabetes");
  });

  it("does not retry transport failures through the legacy planner", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic");
    const fetch = vi.fn(async () => {
      throw new Error("Synthetic transport failure");
    });
    vi.stubGlobal("fetch", fetch);
    await expect(parseAndPlan("GP review", undefined, undefined, "2020-02-01")).rejects.toThrow(
      "transport",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("request cache locator", () => {
  it("shares chip text and chip ids without weakening patient, cutoff or input identity", () => {
    const chip = CHIPS[0];
    const key = requestCacheKey({ text: chip.text });
    expect(requestCacheKey({ text: chip.text, chipId: chip.id })).toBe(key);
    expect(requestCacheKey({ text: chip.text, patientId: "another" })).not.toBe(key);
    expect(requestCacheKey({ text: chip.text, asOf: "2020-01-01" })).not.toBe(key);
    expect(requestCacheKey({ text: "Synthetic task" })).not.toBe(key);
    expect(() => requestCacheKey({ text: chip.text, chipId: "unknown" })).toThrow("Unknown");
  });
});

describe("interactive request priority", () => {
  it("moves lens work ahead of queued background work within the same budget", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic");
    vi.stubEnv("MEDLYN_LLM_CONCURRENCY", "1");
    const started: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
      const name = JSON.parse(String(init.body)).response_format.json_schema.name;
      started.push(name);
      if (name === "first") await gate;
      return response({ ok: true });
    });
    const schema = z.object({ ok: z.boolean() });
    const first = structured("fast", "first", schema, []);
    await vi.waitFor(() => expect(started).toEqual(["first"]));
    const background = structured("fast", "background", schema, []);
    const lens = withLensPriority(() => structured("fast", "lens", schema, []));
    release();
    await Promise.all([first, background, lens]);
    expect(started).toEqual(["first", "lens", "background"]);
  });
});
