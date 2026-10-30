import { describe, expect, it } from "vitest";
import { POST as build } from "../../../apps/web/app/api/letter/route.ts";
import { POST as edit } from "../../../apps/web/app/api/letter/edit/route.ts";

const request = (body: unknown) => new Request("http://localhost/api/letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

describe("letter API input validation", () => {
  it("rejects missing session identity or invalid evidence dates", async () => {
    expect((await build(request({}))).status).toBe(400);
    expect((await build(request({ sessionId: "s", asOf: "tomorrow" }))).status).toBe(400);
  });
  it("rejects edits without their original claim and author", async () => {
    expect((await edit(request({ letterId: "letter", text: "Edited sentence" }))).status).toBe(400);
  });
});
