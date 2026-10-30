# Local verifier pilot

Run from `ml/` with the existing uv environment:

In a restricted session, prefix commands with `UV_CACHE_DIR=/private/tmp/medlyn-uv-cache`
and use `uv run --no-sync` to use the installed environment without touching the user cache.

```sh
uv run python -m verifier.build_dataset
uv run python -m verifier.train
uv run python -m verifier.evaluate --local --proxy --real --limit 90
uv run python -m verifier.evaluate --retry-unavailable
uv run python -m verifier.serve
uv run python -m pytest tests/test_verifier_dataset.py
```

The trainer uses the cached Qwen3-1.7B 4-bit base, eight adapted layers, prompt masking,
512-token sequences and one epoch. It terminates its training subprocess after at most
45 minutes and writes progress/checkpoints under `runs/` and `adapters/`. To launch in
the background, redirect stdout/stderr to `verifier/runs/launcher.log` after creating
that directory. Do not run multiple training/inference jobs on this GPU concurrently.

`GET http://127.0.0.1:8765/health` reports readiness. `POST /verify` accepts a `claim`
and `passages` array (`text`, optional `section`, `before`, `after`, `documentDate`).
Requests beyond the training context window fail; evidence is never silently truncated.
The returned probability normalises sequence likelihoods of the three candidate labels.
It is uncalibrated and must not be treated as clinical confidence.

The engine client is gated on `MEDLYN_VERIFIER=local`. Integration into `semantic()`
is deliberately left to the orchestrator: keep `codeCheck` first, call `localVerify`
with the same located segments and neighbours inside its existing try/catch, and map
`supported` to `supported`, both other labels to `unsupported`. Keep all evidence,
absence, template and cache checks. A separate validator version including model and
adapter hashes is required before enabling the hook, so GPT cache verdicts cannot be
reused as local results. A model trained on this pilot is not production validated.

`DATASET.md` and `RESULTS.md` report actual counts and measurements after execution.
Generated rows, predictions, real-patient text, logs and adapters are ignored by git.

The current environment lost Metal access after a 60-second smoke run (30 updates,
no checkpoint). The full run failed at MLX import. No trained adapter or local-model
quality/latency result is available. Rerun training in a GPU-enabled Mac session before
starting the server. Its dataset is ready: 5,001 balanced training rows, 600 validation
rows and 900 test rows. Keep test labels out of subsequent prompt/model tuning.
