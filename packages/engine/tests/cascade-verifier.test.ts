import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  acceptsLocal,
  type CascadePolicy,
  cascadeIdentity,
  cascadeVerify,
  parseCascadePolicy,
} from "../claims/cascade.ts";
import type { LocalVerdict } from "../claims/local-verifier.ts";

const policy: CascadePolicy = {
  schemaVersion: 1,
  enabled: true,
  threshold: 0.8,
  temperature: 2,
  verifierIdentity: `verifier-${"a".repeat(64)}`,
  validationSha256: "b".repeat(64),
  selectionSplit: "valid",
  probabilityKind: "temperature_scaled_closed_set_score",
};
const verdict: LocalVerdict = {
  label: "supported",
  probability: 0.9,
  probabilityKind: "temperature_scaled_closed_set_score",
  verifierIdentity: policy.verifierIdentity,
  calibrationTemperature: policy.temperature,
  calibrationValidationSha256: policy.validationSha256,
};

describe("cascade policy", () => {
  it("requires validation selection and finite parameters", () => {
    expect(parseCascadePolicy(policy)).toEqual(policy);
    for (const change of [
      { threshold: Number.NaN },
      { temperature: 0 },
      { selectionSplit: "test" },
    ]) {
      expect(() => parseCascadePolicy({ ...policy, ...change })).toThrow("Invalid");
    }
  });

  it("requires calibrated confidence from the matching model", () => {
    expect(acceptsLocal(verdict, policy)).toBe(true);
    expect(acceptsLocal({ ...verdict, verifierIdentity: "different" }, policy)).toBe(false);
    expect(acceptsLocal({ ...verdict, probability: 0.79 }, policy)).toBe(false);
    expect(acceptsLocal({ ...verdict, calibrationTemperature: 3 }, policy)).toBe(false);
    expect(acceptsLocal({ ...verdict, calibrationValidationSha256: "different" }, policy)).toBe(
      false,
    );
    expect(acceptsLocal({ ...verdict, probability: Number.POSITIVE_INFINITY }, policy)).toBe(false);
    expect(
      acceptsLocal(
        { ...verdict, probabilityKind: "uncalibrated_closed_set_sequence_score" },
        policy,
      ),
    ).toBe(false);
  });

  it("versions every policy field without removing the existing validator version", () => {
    const original = cascadeIdentity("base-version", policy);
    expect(original.startsWith("base-version:cascade-1:")).toBe(true);
    for (const change of [
      { threshold: 0.7 },
      { temperature: 3 },
      { enabled: false },
      { validationSha256: "c".repeat(64) },
      { verifierIdentity: `verifier-${"c".repeat(64)}` },
    ]) {
      expect(cascadeIdentity("base-version", { ...policy, ...change })).not.toEqual(original);
    }
  });
});

describe.sequential("cascade routing over HTTP", () => {
  let server: Server;
  let payload: unknown = verdict;
  let gptCalls = 0;
  const previous = process.env.MEDLYN_VERIFIER;
  const gpt = async () => {
    gptCalls++;
    return {
      support: "supported" as const,
      negationFlag: false,
      details: { reason: "GPT fixture" },
    };
  };
  beforeAll(async () => {
    server = createServer((request, response) => {
      request.resume();
      response.writeHead(200, { "Content-Type": "application/json" });
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

  it("keeps the default GPT route", async () => {
    delete process.env.MEDLYN_VERIFIER;
    expect((await cascadeVerify("Claim", [], policy, gpt)).details.reason).toBe("GPT fixture");
    expect(gptCalls).toBe(1);
  });
  it("saves a GPT call above the validation threshold", async () => {
    process.env.MEDLYN_VERIFIER = "cascade";
    expect(
      (await cascadeVerify("Claim", [{ text: "Evidence" }], policy, gpt)).details.backend,
    ).toBe("local");
    expect(gptCalls).toBe(1);
  });
  it("propagates GPT failures without inventing a verdict", async () => {
    await expect(
      cascadeVerify("Claim", [], { ...policy, enabled: false }, async () => {
        throw new Error("GPT unavailable");
      }),
    ).rejects.toThrow("GPT unavailable");
  });
  it("maps contradictions to unsupported", async () => {
    payload = { ...verdict, label: "contradicted" };
    expect((await cascadeVerify("Claim", [{ text: "Evidence" }], policy, gpt)).support).toBe(
      "unsupported",
    );
  });
  it("escalates low confidence and malformed service responses", async () => {
    payload = { ...verdict, probability: 0.3 };
    expect(
      (await cascadeVerify("Claim", [{ text: "Evidence" }], policy, gpt)).details.backend,
    ).toBe("gpt");
    payload = {};
    expect(
      (await cascadeVerify("Claim", [{ text: "Evidence" }], policy, gpt)).details.backend,
    ).toBe("gpt");
    expect(gptCalls).toBe(3);
  });
});
