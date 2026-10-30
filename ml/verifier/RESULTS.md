# Verifier results

Machine-measured research results; no human gold claims.

| Set | Method | n | Macro F1 | Coverage | Mean ms |
|---|---|---:|---:|---:|---:|
| synthetic_heldout_families | rules_only | 90 | 0.287 | 1.000 | 0.1 |
| synthetic_heldout_families | proxy_fast | 90 | 0.898 | 1.000 | 2026.7 |
| heldout_mutation_types | rules_only | 14 | 0.000 | 1.000 | 0.1 |
| heldout_mutation_types | proxy_fast | 14 | 0.242 | 1.000 | 1471.4 |
| real_patient_weak_labels | rules_only | 30 | 0.259 | 1.000 | 0.1 |
| real_patient_weak_labels | proxy_fast | 30 | 0.333 | 1.000 | 1942.9 |

Real patient: 38 eligible cached letter claims.
Local model: unavailable: ImportError (No Metal device available).

Per-class precision/recall/F1 and latency percentiles are in results.json.

- Synthetic labels are not human gold
- Real labels reuse the engine judge
- Code-check pass is necessary but does not entail support
- Local probabilities are uncalibrated closed-set sequence scores
- Macro F1 uses all three labels even in subsets with absent classes; inspect per-class support

Proxy calls: 0; concurrency ≤3. Monetary cost unavailable.
Cached proxy predictions reused: 120; their original request latencies are retained.
