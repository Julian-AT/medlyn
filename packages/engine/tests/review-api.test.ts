import { describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "../../../apps/app/app/api/review/route.ts";

const request = (method: string, body?: unknown, query = "") =>
  new Request(`http://localhost/api/review${query}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });

describe("review API input validation", () => {
  it("rejects a missing session before touching storage", async () => {
    expect((await GET(request("GET"))).status).toBe(400);
    expect((await GET(request("GET", undefined, "?sessionId=%20"))).status).toBe(400);
    expect((await DELETE(request("DELETE"))).status).toBe(400);
  });
  it("rejects malformed JSON and unknown actions", async () => {
    expect(
      (await POST(new Request("http://localhost/api/review", { method: "POST", body: "{" })))
        .status,
    ).toBe(400);
    expect((await POST(request("POST", { sessionId: "s", action: "invented" }))).status).toBe(400);
  });
  it("rejects corrections without proposed text and dismissals without a reason", async () => {
    const base = {
      sessionId: "s",
      targetType: "fact",
      targetId: "fact",
      targetHash: "hash",
      author: "Clinician",
    };
    const correction = await POST(request("POST", { ...base, action: "correct" }));
    expect(correction.status).toBe(409);
    expect((await correction.json()).error).toContain("proposed text");
    const dismissal = await POST(
      request("POST", { ...base, targetType: "finding", action: "dismiss" }),
    );
    expect(dismissal.status).toBe(409);
    expect((await dismissal.json()).error).toContain("reason");
  });
});
