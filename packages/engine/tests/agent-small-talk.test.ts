import { afterEach, describe, expect, it, vi } from "vitest";
import { smallTalkResponse } from "../../../apps/app/app/api/chat/small-talk.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("small-talk response stream", () => {
  it.each(["hi", "thanks", "who are you?", "help"])(
    "streams fixed boilerplate for %s without any network or tool calls",
    async (question) => {
      const fetcher = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValue(new Error("Unexpected network"));
      vi.stubEnv("MODEL_FAST", "");
      vi.stubEnv("DATABASE_URL", "");
      const response = smallTalkResponse(question);
      expect(response?.status).toBe(200);
      const body = await response?.text();
      expect(body).toContain("I'm Medlyn");
      expect(body).toContain('"type":"finish"');
      expect(body).not.toMatch(/tool-|data-evidence-context|data-validated|"type":"error"/);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("leaves clinical and mixed requests for the normal validated stream", () => {
    expect(smallTalkResponse("hi, show the weight trend")).toBeNull();
  });
});
