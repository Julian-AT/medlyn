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
  it.each(["", " ", " padded", "padded "])(
    "rejects invalid sessions consistently: %j",
    async (sessionId) => {
      const query = `?${new URLSearchParams({ sessionId })}`;
      expect((await GET(request("GET", undefined, query))).status).toBe(400);
      expect((await DELETE(request("DELETE", undefined, query))).status).toBe(400);
      expect((await DELETE(request("DELETE", { sessionId }))).status).toBe(400);
      expect(
        (
          await POST(
            request("POST", {
              sessionId,
              targetType: "card",
              targetId: "card",
              targetHash: "hash",
              action: "accept",
              author: "Clinician",
            }),
          )
        ).status,
      ).toBe(400);
    },
  );
  it("rejects an empty query session even when the DELETE body has a session", async () => {
    expect((await DELETE(request("DELETE", { sessionId: "s" }, "?sessionId="))).status).toBe(400);
  });
  it("returns a successful empty ledger for synthetic patients", async () => {
    const response = await GET(
      new Request("http://localhost/api/review?sessionId=s&patientId=synthetic-a", {
        headers: { Cookie: "medlyn-patient=synthetic-a" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
  });
  it.each([GET, POST, DELETE])(
    "rejects a stale patient cookie before reading or writing",
    async (handler) => {
      const response = await handler(
        new Request("http://localhost/api/review?sessionId=s&patientId=patient-0000-0001", {
          method: handler.name,
          headers: { Cookie: "medlyn-patient=synthetic-a" },
        }),
      );
      expect(response.status).toBe(409);
      expect((await response.json()).error).toContain("patient changed");
    },
  );
  it.each([POST, DELETE])("keeps synthetic writes unavailable", async (handler) => {
    const response = await handler(
      new Request("http://localhost/api/review?sessionId=s&patientId=synthetic-a", {
        method: handler.name,
        headers: { Cookie: "medlyn-patient=synthetic-a" },
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("synthetic patients");
  });
  it.each([GET, POST, DELETE])("rejects invalid patient identities", async (handler) => {
    const response = await handler(
      new Request("http://localhost/api/review?sessionId=s&patientId=invalid/patient", {
        method: handler.name,
      }),
    );
    expect(response.status).toBe(400);
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
