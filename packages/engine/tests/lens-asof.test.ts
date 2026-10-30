import { afterEach, describe, expect, it, vi } from "vitest";
import { parseSituation } from "../lens/parse.ts";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("typed evidence cutoff", () => {
  it("preserves a parsed cutoff independently of the planned procedure date", async () => {
    vi.stubEnv("MODEL_FAST", "synthetic-test-model");
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const request = JSON.parse(String(init.body));
      expect(request.response_format.json_schema.schema.properties.asOf).toBeDefined();
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  role: "GP",
                  task: "Diabetes review",
                  setting: null,
                  concerns: [],
                  procedure: "Synthetic procedure",
                  procedureDate: "2020-03-01",
                  asOf: "2019-12-01",
                }),
              },
            },
          ],
        }),
      );
    });
    const parsed = await parseSituation(
      "Review as of 2019-12-01",
      undefined,
      undefined,
      "2020-01-01",
    );
    expect(parsed.asOf).toBe("2019-12-01");
    expect(parsed.procedureDate).toBe("2020-03-01");
    expect((await parseSituation("Review", "2019-11-01")).asOf).toBe("2019-11-01");
  });
});
