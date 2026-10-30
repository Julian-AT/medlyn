export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
export function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
export function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
export function label(value: string): string {
  const names: Record<string, string> = {
    local_qlora: "Local LoRA verifier",
    rules_only: "Rules only",
    proxy_fast: "GPT judge",
    synthetic_heldout_families: "Synthetic held-out families",
    heldout_mutation_types: "Held-out mutation types",
    real_patient_weak_labels: "Real patient · weak labels",
    bm25: "BM25",
    vector: "Vector",
    hybrid: "Hybrid",
    val: "Validation",
    train: "Training",
    test: "Test",
  };
  return names[value] ?? value.replaceAll("_", " ").replace(/^./, (char) => char.toUpperCase());
}
export function count(value: number | null): string {
  return value === null ? "Unmeasured" : value.toLocaleString("en-GB");
}
export function percent(value: number | null): string {
  return value === null ? "Unmeasured" : `${(value * 100).toFixed(1)}%`;
}
export function milliseconds(value: number | null): string {
  return value === null
    ? "Unmeasured"
    : value < 1000
      ? `${value.toFixed(1)} ms`
      : `${(value / 1000).toFixed(2)} s`;
}
