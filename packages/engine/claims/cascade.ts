import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { hasNegation } from "./code-check.ts";
import { type LocalPassage, type LocalVerdict, localVerify } from "./local-verifier.ts";

export type CascadePolicy = {
  schemaVersion: 1;
  enabled: boolean;
  threshold: number;
  temperature: number;
  verifierIdentity: string;
  validationSha256: string;
  selectionSplit: "valid";
  probabilityKind: "temperature_scaled_closed_set_score";
};

export type CascadeVerdict = {
  support: "supported" | "partial" | "unsupported";
  negationFlag: boolean;
  details: Record<string, unknown>;
};

export function parseCascadePolicy(value: unknown): CascadePolicy {
  if (!value || typeof value !== "object") throw new Error("Invalid cascade policy");
  const policy = value as Partial<CascadePolicy>;
  if (
    policy.schemaVersion !== 1 ||
    typeof policy.enabled !== "boolean" ||
    typeof policy.threshold !== "number" ||
    !Number.isFinite(policy.threshold) ||
    policy.threshold < 0 ||
    policy.threshold > 1 ||
    typeof policy.temperature !== "number" ||
    !Number.isFinite(policy.temperature) ||
    policy.temperature <= 0 ||
    !/^verifier-[a-f0-9]{64}$/.test(policy.verifierIdentity ?? "") ||
    !/^[a-f0-9]{64}$/.test(policy.validationSha256 ?? "") ||
    policy.selectionSplit !== "valid" ||
    policy.probabilityKind !== "temperature_scaled_closed_set_score"
  ) {
    throw new Error("Invalid cascade policy; calibration must be selected on validation");
  }
  return policy as CascadePolicy;
}

export async function loadCascadePolicy(path: string): Promise<CascadePolicy> {
  return parseCascadePolicy(JSON.parse(await readFile(path, "utf8")));
}

/** Append this to the existing validator version before any validation-cache read. */
export function cascadeIdentity(baseVersion: string, policy: CascadePolicy): string {
  const checked = parseCascadePolicy(policy);
  const identity = JSON.stringify([
    checked.schemaVersion,
    checked.enabled,
    checked.verifierIdentity,
    checked.validationSha256,
    checked.threshold,
    checked.temperature,
    checked.probabilityKind,
  ]);
  return `${baseVersion}:cascade-1:${createHash("sha256").update(identity).digest("hex")}`;
}

export function acceptsLocal(verdict: LocalVerdict, policy: CascadePolicy): boolean {
  return (
    policy.enabled &&
    Number.isFinite(verdict.probability) &&
    verdict.probability >= 0 &&
    verdict.probability <= 1 &&
    verdict.probabilityKind === policy.probabilityKind &&
    verdict.verifierIdentity === policy.verifierIdentity &&
    verdict.calibrationTemperature === policy.temperature &&
    verdict.calibrationValidationSha256 === policy.validationSha256 &&
    verdict.probability >= policy.threshold
  );
}

/** Call after location, eligibility and code checks, inside the shared semantic boundary. */
export async function cascadeVerify(
  claim: string,
  passages: LocalPassage[],
  policy: CascadePolicy,
  gpt: () => Promise<CascadeVerdict>,
): Promise<CascadeVerdict> {
  if (process.env.MEDLYN_VERIFIER !== "cascade") return gpt();
  const checked = parseCascadePolicy(policy);
  if (!checked.enabled) return gpt();
  try {
    const local = await localVerify(claim, passages);
    if (local && acceptsLocal(local, checked)) {
      return {
        support: local.label === "supported" ? "supported" : "unsupported",
        negationFlag:
          hasNegation(claim) ||
          passages.some((passage) =>
            hasNegation(
              [passage.text, ...(passage.before ?? []), ...(passage.after ?? [])].join(" "),
            ),
          ),
        details: {
          backend: "local",
          verifierIdentity: checked.verifierIdentity,
          confidence: local.probability,
          probabilityKind: local.probabilityKind,
          threshold: checked.threshold,
        },
      };
    }
  } catch (error) {
    console.warn("Cascade escalating to GPT", {
      reason: error instanceof Error ? error.name : "UnknownError",
    });
  }
  const verdict = await gpt();
  return { ...verdict, details: { ...verdict.details, backend: "gpt" } };
}
