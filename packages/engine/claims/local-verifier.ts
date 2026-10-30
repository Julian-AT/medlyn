export type LocalPassage = {
  text: string;
  section?: string | null;
  before?: string[];
  after?: string[];
  documentDate?: string;
};

export type LocalVerdict = {
  label: "supported" | "unsupported" | "contradicted";
  probability: number;
  probabilityKind: "uncalibrated_closed_set_sequence_score" | "temperature_scaled_closed_set_score";
  verifierIdentity?: string;
  calibrationTemperature?: number;
  calibrationValidationSha256?: string;
};

/** Optional research backend; malformed responses throw for the caller to handle. */
export async function localVerify(
  claim: string | { text: string },
  passages: LocalPassage[],
): Promise<LocalVerdict | null> {
  if (!["local", "cascade"].includes(process.env.MEDLYN_VERIFIER ?? "")) return null;
  const text = typeof claim === "string" ? claim : claim.text;
  if (!text.trim() || !passages.length || passages.some((passage) => !passage.text.trim())) {
    throw new Error("Local verifier requires a claim and located passages");
  }
  const response = await fetch("http://127.0.0.1:8765/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claim: text, passages }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Local verifier unavailable (${response.status})`);
  const value: unknown = await response.json();
  if (
    !value ||
    typeof value !== "object" ||
    !("label" in value) ||
    typeof value.label !== "string" ||
    !["supported", "unsupported", "contradicted"].includes(value.label) ||
    !("probability" in value) ||
    typeof value.probability !== "number" ||
    !Number.isFinite(value.probability) ||
    value.probability < 0 ||
    value.probability > 1 ||
    !("probabilityKind" in value) ||
    !["uncalibrated_closed_set_sequence_score", "temperature_scaled_closed_set_score"].includes(
      String(value.probabilityKind),
    ) ||
    ("verifierIdentity" in value && typeof value.verifierIdentity !== "string") ||
    ("calibrationTemperature" in value &&
      (typeof value.calibrationTemperature !== "number" ||
        !Number.isFinite(value.calibrationTemperature))) ||
    ("calibrationValidationSha256" in value &&
      typeof value.calibrationValidationSha256 !== "string")
  ) {
    throw new Error("Malformed local verifier response");
  }
  return value as LocalVerdict;
}
