# Local verifier research

[runbook.md](RUNBOOK.md) contains the exact ordered commands. Use the installed environment:
`UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync ...`, from `ml/`.

The v2 builder adds explicit number swaps, bilingual side flips, negation scope, temporal shifts
and wrong-document citations. It creates 30k balanced examples, separately reports rewritten
prose, and freezes test input hashes. `audit_dataset` checks provenance and leakage on CPU.

`sweep` attempts Qwen3-1.7B/4B × rank 8/16 × 1/2 epochs under one two-hour deadline. All runs use
the same seeded balanced training subset, default 1,200 rows; `--train-limit` records a smaller
or larger budget. The trainer itself defaults to the full training file. Each run has its own
adapters, command, training hashes, log and `metrics.json`. Only completed runs with full validation
coverage may win. Test examples never enter the training subprocess.

`evaluate` fits temperature and cascade threshold on validation only. It reports macro-F1,
patient-cluster bootstrap intervals, mutation confusion matrices, ECE/reliability bins, latency,
proxy usage/cost when known, and cascade savings. It reuses identity-matched GPT predictions.
Thirty failures per method/suite receive automatic tags in ignored exports; independent human annotations
are unavailable. `--dry-run` executes the rules/metrics pipeline with no MLX or proxy calls.

`build_real_gold` exports 50 located supported facts and 50 rule negatives to ignored storage.
Its tracked manifest contains only counts, ids and UTF-16 offsets. The name is a CLI label: these
are rule labels without independent clinician review, not clinical gold. The loader reads the configured local
corpus, requires the same DB revision, and uses the store's evidence window. It never writes DB.

`serve` remains serial on loopback port 8765. With `--policy`, each result carries the model/adapter
identity, validation hash and calibration temperature. The TypeScript cascade rejects mismatched
or raw scores and escalates local errors or low confidence to GPT.

Application integration is an orchestrator request: `claims/validate.ts` and `claims/version.ts`
are outside this lane. Preserve location/code checks, templates, proven absence, the one evidence
window and full cache identity. See the runbook's concrete integration steps. The default path is
unchanged until the orchestrator integrates and verifies the regression.

The legacy pilot CLI remains available with `evaluate --version 1`. Never retry or retune a test
set to select a model. [dataset.md](DATASET.md), [model-card.md](model-card.md) and
[results.md](RESULTS.md) distinguish actual artifacts from unrun targets.
