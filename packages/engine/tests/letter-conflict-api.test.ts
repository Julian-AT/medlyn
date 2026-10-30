import { describe, expect, it, vi } from "vitest";

vi.mock("../letter/window.ts", async (original) => {
  const module = await original<typeof import("../letter/window.ts")>();
  return {
    ...module,
    resolveLetterWindow: async () => {
      throw new module.LetterWindowConflict("Letter request conflicts with the lens evidence window");
    },
  };
});

import { POST } from "../../../apps/web/app/api/letter/route.ts";

describe("letter API evidence conflicts", () => {
  it("returns HTTP 409 when the requested window conflicts with the lens", async () => {
    const response = await POST(new Request("http://localhost/api/letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "s", lensKey: "older-lens", asOf: "2016-04-15" }),
    }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Letter request conflicts with the lens evidence window",
    });
  });
});
