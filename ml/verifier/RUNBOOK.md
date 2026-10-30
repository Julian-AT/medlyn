# Lane E runbook

Run from `/Users/julianschmidt/Developer/medlyn/ml`. Dependencies are already installed. Use the
root `.env`; do not create a package dotenv. Run GPU work only on the authorised Mac; submission checks do not run MLX. Set
`UV_CACHE_DIR=/private/tmp/medlyn-uv-cache` for restricted CPU sessions; all commands below use
`--no-sync` and do not install dependencies. GPU jobs must yield to the regression/demo.

## Artifacts already prepared

- `verifier/runs/data-v2`: 24,000 train, 3,000 validation, 3,000 test, plus a separate 900-example
  rewritten suite from 30 eligible test patients. Span/split/frozen-hash audit passes.
- `verifier/runs/real/real-gold.examples.jsonl`: 100 test-only real-text rule-labelled claims.
  `real-gold-manifest.json` contains only counts, ids and offsets.
- `results.json` and `results.md`: the completed checkpoint evaluation with CIs, confusion, calibration and
  offline cascade projections. Error exports stay in ignored runs.
- The full-data checkpoint and validation-selected threshold exist. The training run hit its
  cap before finishing an epoch. Offline savings do not establish a live regression score.

## 1. Reproduce CPU checks

```sh
uv run --no-sync python -m pytest tests/test_verifier_dataset.py tests/test_verifier_statistics.py tests/test_verifier_v2_data.py
uv run --no-sync python -m verifier.audit_dataset --data verifier/runs/data-v2
uv run --no-sync python -m verifier.build_real_gold --dry-run
```

A complete tiny CLI exercise, using fresh output names:

```sh
uv run --no-sync python -m verifier.build_dataset --dry-run --out verifier/runs/cpu-data
uv run --no-sync python -m verifier.sweep --dry-run --data verifier/runs/cpu-data --out verifier/runs/cpu-sweep --train-limit 30
uv run --no-sync python -m verifier.evaluate --dry-run --data verifier/runs/cpu-data --limit 18 --bootstrap 50 --out verifier/runs/cpu-results.json
```

Dry runs do not import MLX, perform inference, call the proxy or select a winner. Frozen data and
run directories refuse replacement; use a new name when repeating these commands.

## 2. Prepare the 300-patient prose test family and freeze final data

The old 300 rewrites span all source splits; only 30 are eligible for a test family. This command
copies untouched, already test-assigned patients and invokes the existing bounded rewriter with
three workers. It does not alter `data/synth-v1`. Check `patientsRewritten` in its output; rejected
rewrites are not counted as successes. Do not claim 300 if fewer survive verification.

```sh
uv run --no-sync python -m verifier.prepare_rewrites --source data/synth-v1 --out verifier/runs/rewrite-test300 --count 300
uv run --no-sync python -m verifier.build_dataset --source verifier/runs/rewrite-test300 --source data/synth-v1 --source data/sample --out verifier/runs/data-v2-final
uv run --no-sync python -m verifier.audit_dataset --data verifier/runs/data-v2-final
uv run --no-sync python -m verifier.build_real_gold
```

The real exporter reads only the configured local corpus and shared database. It requires matching
corpus revisions and located supported facts inside `store.evidenceWindow`. It writes no database
tables. If the data/revision is unavailable, retain the existing local set and report that status.

## 3. Train and select on the GPU-enabled Mac: one command

```sh
uv run --no-sync python -m verifier.sweep --data verifier/runs/data-v2-final --out verifier/runs/sweep-v2 --minutes 120 --train-limit 600 --validation-limit 150
```

All eight configurations use the same seeded 600-example balanced training subset to fit the
two-hour exploratory budget. Epochs refer to that subset. The CLI default is 1,200 rows; explicitly
requesting `--train-limit 24000` attempts full-data runs under the same cap and may complete none.
Each configuration has `runs/sweep-v2/run-XX/{run.json,metrics.json,adapters/}` and logs in the sweep
root. Timed-out or failed runs are recorded and excluded. `selection.json` picks validation
macro-F1 only, with full inference coverage required. A dry run has no winner. Larger models may
fail the memory/time cap; inspect statuses rather than describing all eight as completed.

For a separate full-data single run (45-minute cap, may end incomplete):

```sh
uv run --no-sync python -m verifier.train --data verifier/runs/data-v2-final --run verifier/runs/full-v2 --rank 8 --epochs 1 --minutes 45
```

Training gets only train/validation files. It checks their token lengths before launching MLX and
never truncates an answer. Model downloads/preflight are included in the sweep subprocess cap.

## 4. Evaluate and calibrate: one command after a winner exists

```sh
uv run --no-sync python -m verifier.evaluate --data verifier/runs/data-v2-final --selection verifier/runs/sweep-v2/selection.json --local --proxy --real verifier/runs/real/real-gold.examples.jsonl --limit 300 --proxy-budget 700 --bootstrap 1000
```

The command fits temperature and threshold on validation, then evaluates frozen synthetic,
rewritten and real-rule suites separately. It writes `results.json`, `results.md`,
`runs/data-v2-final/cascade-policy.json`, prediction artifacts, reliability bins and up to 30
failure records per method/suite. Cascade savings here are offline routing projections: both sets
of predictions are collected for comparison. Automatic failure tags await human annotation. Proxy cache
entries must match input and judge identity; their historical latency is retained. Up to 700 new
calls covers 300 synthetic + 300 rewritten + 100 real examples, at concurrency three. Actual
costs remain null without usage and known rates; optionally provide `--input-usd-per-million`
and `--output-usd-per-million`. Local energy cost remains unmeasured.

Macro-F1 averages all three classes even on the two-class real-rule set. The real set's CI is a
claim bootstrap conditional on one patient, not between-patient uncertainty. Do not combine any
of these scores with real regression, blind situations or synthetic pipeline results.

## 5. Serve calibrated weights

```sh
uv run --no-sync python -m verifier.serve --selection verifier/runs/sweep-v2/selection.json --policy verifier/runs/data-v2-final/cascade-policy.json
```

The server checks that the policy matches the selected adapter. It binds loopback port 8765,
serves `/health` and `/verify`, and performs inference serially. Responses bind model/adapter,
validation hash and temperature. Raw serving without `--policy` cannot satisfy cascade acceptance.

## 6. Orchestrator integration requests (outside lane ownership)

1. In `packages/engine/claims/validate.ts`, preserve the complete existing eligibility, location,
   `codeCheck`, template, absence and transient-error logic. Wrap only the current composed-claim
   GPT semantic callback with `cascadeVerify(claim.text, passages, policy, gptCallback)`. Build
   `LocalPassage[]` from the same segments/headings/neighbours; include document dates. The
   callback returns the existing `{ support, negationFlag, details }` verdict. Pass through GPT's
   `partial` result; local contradicted/unsupported both map to unsupported.
2. Load `cascade-policy.json` once for the validation context. Capture one immutable policy for
   cache identity and routing. Extend the existing validator version with
   `cascadeIdentity(VALIDATOR_VERSION, policy)` **before any validation cache read** when the mode
   is cascade. Keep all existing patient/revision/window/text/fact-hash/segment fields. Never reuse
   a GPT-only cache key. Include that derived version in lens/cache identities too.
3. Add `cascade` to root `.env.example`'s verifier inventory and provide a configured policy path
   through the orchestrator's chosen configuration mechanism. This lane adds no hidden env path.
   `MEDLYN_VERIFIER=cascade` gates routing; unset keeps GPT unchanged. Policy parse failures should
   disable promotion or fail startup; do not reinterpret them as clinical support.
4. Run only the approved **regression-only** harness with an empty review overlay. Do not invoke
   `pnpm eval --suite real|all`, which schedules the closed blind worker. Record GPT/default and
   cascade 15-answer results and actual GPT calls separately. Keep the mode unset until regression
   remains 15/15 and the orchestrator accepts the measured trade-off.
5. Research › Evaluation may read the aggregate v2 `results.json` schema. Pilot statistics have
   `status=pilot_v1_predictions_reanalysed_no_retraining`; do not label them new training results.

Engine checks from the repository root:

```sh
pnpm --dir packages/engine exec tsc --noEmit
pnpm --dir packages/engine exec vitest run tests/verifier-local.test.ts tests/cascade-verifier.test.ts --fileParallelism=false
pnpm exec biome check ml/verifier/bridge.ts packages/engine/claims/local-verifier.ts packages/engine/claims/cascade.ts packages/engine/tests/cascade-verifier.test.ts
```

`--fileParallelism=false` serialises the two HTTP tests sharing fixed loopback port 8765. Stop the
research server first. Run Python formatting/lint on owned files only. No installation, staging,
committing or modifications to the frozen contracts/schema are part of this lane.

## Commit plan

The ordered, exact path allocation is `/private/tmp/medlyn-ml-v2-commits.json`. The changes are
split into dataset integrity, hard negatives/builder, test-family rewrites, real-rule export,
statistics/calibration, model identity, evaluation/reporting, bounded training, validation sweep,
calibrated serving, local transport, engine cascade, CPU data tests, statistics tests, cascade
transport tests, pilot reanalysis and release documentation. Every changed path appears once.
The orchestrator integrates and commits; this lane does not use git mutation commands.
