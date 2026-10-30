Run `pnpm eval --suite synthetic` from the repository root. The existing real suite stays the default; `--suite all` runs both. Synthetic-only execution never loads real-patient cases or held-out inputs/results. It appends its section to `eval/output/summary.md` without reading existing sections.

The generator reads the shared patient/documents/labels JSONL format from `ml/data/sample` followed by `ml/data/synth-v1/shards`, selects up to 50 patients (ingested ids first), validates normalized label offsets, and writes `eval/synthetic/challenges.json`. It creates at least 150 challenges, with three questions each. With the 20-patient sample it creates 160. The five tier-1 profiles, additional specialty profiles and unfamiliar roles cover tiers 1–3. Expectations use explicit label `needIds` when available, falling back to catalog kinds/synonyms for the base shared format. No engine-extracted fact is used as ground truth.

A fact answer requires its expected located citation, identity/label, attributes, assertion and timing. Wording differences can use the configured `MODEL_REASONING` rubric, with at most three simultaneous judges. Gaps require a supported absence claim covering the entire evidence window; unavailable checks fail. Findings match source spans one-to-one; unmatched/duplicate findings count as false alarms, and labelled distractors must stay absent. Every measured screen also receives traceability and availability checks. These are automated research measurements, not human gold or submission figures.

The live provider passes both `request.patientId` and a second `{ patientId }` options argument to `streamLens`. It verifies the first event's patient, corpus revision and complete eligible document set against the requested synthetic evidence window. A default-patient response fails. The engine lane must implement one of those internal patient arguments and thread it through the pipeline; the frozen screen contract does not need changing.

Retrieval calls `packages/engine/search/eval.ts`'s `evaluateRetrieval(cases, mode, k)` for BM25, vector and hybrid at 5 and 10. Relevant spans come from labels. Missing embedding credentials leave vector unmeasured and label hybrid as degraded. Verifier results are imported from `ml/verifier/results.json` if present. Missing dependencies, patients and model results remain explicitly unmeasured. They never become zero-valued successful measurements.

Controls:

| Environment variable      | Default                 | Purpose                                                             |
| ------------------------- | ----------------------- | ------------------------------------------------------------------- |
| `EVAL_SYNTH_PATIENTS`     | 50                      | Maximum labelled patients                                           |
| `EVAL_SYNTH_DATA`         | sample, then synth-v1   | Alternative dataset directory, relative to repo root                |
| `EVAL_SYNTH_WAIT_SECONDS` | 30                      | Poll Neon every five seconds until synthetic patients appear        |
| `EVAL_SYNTH_LIMIT`        | all ingested challenges | Limit live screens for a smoke run; other challenges remain skipped |
| `EVAL_CONCURRENCY`        | 3                       | Concurrent synthetic screens, capped at three                       |
| `EVAL_SYNTH_JUDGE`        | enabled                 | Set `0` for deterministic scoring only                              |

The command writes `eval/output/synthetic.json`, including per-question methods, per-screen errors, attempted and skipped counts, cold latency, contradictions net, retrieval and verifier results. The summary reports tier, question type and mutation groups. It exits nonzero when there are no live measurements, fewer than 150 generated challenges, a discovery error, or any attempted screen fails. Skipped un-ingested patients do not masquerade as failed clinical answers.

Generate challenges without the DB: `node --env-file=.env --experimental-strip-types --no-warnings eval/synthetic/challenges.ts`.

Checks:

```
pnpm --filter @medlyn/eval typecheck
node packages/engine/node_modules/vitest/vitest.mjs run --root eval --config vitest.config.ts tests/synthetic-scoring.test.ts tests/synthetic-data.test.ts
```
