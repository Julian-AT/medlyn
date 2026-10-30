import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localVerify } from "../claims/local-verifier.ts";

describe.sequential("optional local verifier", () => {
  let server: Server;
  let status = 200;
  let payload: unknown = {
    label: "supported", probability: 0.8,
    probabilityKind: "uncalibrated_closed_set_sequence_score",
  };
  const previous = process.env.MEDLYN_VERIFIER;

  beforeAll(async () => {
    server = createServer((request, response) => {
      request.resume();
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(payload));
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(8765, "127.0.0.1", resolve);
    });
  });

  afterAll(async () => {
    if (previous === undefined) delete process.env.MEDLYN_VERIFIER;
    else process.env.MEDLYN_VERIFIER = previous;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("does nothing unless explicitly enabled", async () => {
    delete process.env.MEDLYN_VERIFIER;
    expect(await localVerify("Claim", [])).toBeNull();
  });

  it("returns a validated verdict from the local HTTP service", async () => {
    process.env.MEDLYN_VERIFIER = "local";
    expect(await localVerify({ text: "Claim" }, [{ text: "Synthetic evidence" }]))
      .toEqual(payload);
  });

  it("fails closed on missing evidence", async () => {
    await expect(localVerify("Claim", [])).rejects.toThrow("located passages");
  });

  it("rejects malformed probability values", async () => {
    payload = { label: "supported", probability: 1.1 };
    await expect(localVerify("Claim", [{ text: "Evidence" }]))
      .rejects.toThrow("Malformed");
  });

  it("propagates service failures", async () => {
    status = 503;
    await expect(localVerify("Claim", [{ text: "Evidence" }]))
      .rejects.toThrow("unavailable (503)");
  });
});
