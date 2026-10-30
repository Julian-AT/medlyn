# Verifier benchmark runbook

Run from `ml/`. No command trains, tunes thresholds or fits calibration on test data.
No command reads the real blind challenge situations. Patient text stays in ignored
local artifacts; real-text inputs are excluded from proxy and translation calls.

The lane delivered a CPU rules baseline on four frozen populations at
`bench/results/benchmark.json`. Other systems there have **dry-run** status, not scores.
Use a fresh directory for the complete experiment below. Do not rebuild a frozen
population after looking at outcomes.

```sh
export UV_CACHE_DIR=/private/tmp/medlyn-uv-cache
uv run --no-sync python -m pytest tests/test_bench*.py -q
uv run --no-sync python -m bench.run --help
```

## Freeze the experiment once

The v2 lane must finish `verifier/runs/data-v2` and `frozen-test.json`. Its selection
file must identify a completed validation-only winner, with matching validation and
training-subset hashes. Defaults use `verifier/runs/sweep/selection.json`; replace
that path with the actual sweep directory below. Training examples and families
are checked against the benchmark before either adapter runs. V1 uses
`verifier/datasets/train.examples.jsonl`; use `--v1-data` if its lineage differs.

```sh
uv run --no-sync python -m bench.run prepare --out bench/results/full --public --real verifier/runs/real/real-gold.examples.jsonl
```

This selects 300 examples per synthetic condition, 100 real-text examples when
available, and exactly 500 public examples stratified evenly by original dataset
and binary label. Sampling is deterministic, seed 37, and round-robin across strata;
it is not a population-proportional public sample. Clinical families and patients
must be disjoint from train and validation; held-out mutations cannot occur there.
Source hashes and exact frozen suite hashes are recorded. Family and mutation
conditions overlap and must not be pooled. The real-text set is rule-labelled and
**human review pending**, despite the upstream filename containing `gold`.

LLM-AggreFact requires the operator to accept Hugging Face access conditions in a
browser. Use an existing local login/HF_TOKEN if needed; never put tokens in CLI
arguments. A missing credential/access error is recorded as a skipped public suite.
To add public access later, prepare a new directory, then use it for every command.
Pin `--public-revision <commit>` for archival runs; the dataset fingerprint and
frozen local file hash also bind a run started from `main`.

## Fixed English-input condition (one proxy command)

```sh
uv run --no-sync python -m bench.run translate --out bench/results/full --proxy-budget 300
```

This freezes a deterministic, label-stratified subset of 300 unique synthetic
inputs, drawn from the three frozen synthetic populations, before sending requests.
Only evidence is translated; claims remain identical. Every system receives the
same translated inputs in `synthetic-english`. Requests use MODEL_FAST, concurrency
3, and a resumable exact-input/model/prompt cache. Shape and numeric preservation
are checked; semantic label preservation still needs human review. Translation
usage is reported separately and is not hidden in inference cost. Real clinical
text is never translated through the proxy. Existing complete English evidence
translations become separate `*-existing-english` suites shared by all systems;
missing neighbour translations never cause silent context removal.

## One command per local system (GPU host only)

Run these **serially** on the M4 Pro. Each command loads one model. Qwen base and
adapter systems share `verifier.common.messages` and the exact same closed-set
label-sequence scoring as the existing verifier. Base runs pass `adapters=None`.
All Qwen prompts preserve the v1 German-source system instruction, even in the
English/public condition, to avoid giving a different prompt to a comparator.
The 470-token input boundary is unchanged; overlength claims remain unavailable
and count against coverage. Evidence is never truncated to improve the score.

```sh
uv run --no-sync python -m bench.run run --out bench/results/full --systems rules
uv run --no-sync python -m bench.run run --out bench/results/full --systems base-1.7b
uv run --no-sync python -m bench.run run --out bench/results/full --systems base-4b
uv run --no-sync python -m bench.run run --out bench/results/full --systems ours-v1
uv run --no-sync python -m bench.run run --out bench/results/full --systems ours-v2 --selection verifier/runs/sweep/selection.json
uv run --no-sync python -m bench.run run --out bench/results/full --systems minicheck --device mps
```

MiniCheck uses `lytang/MiniCheck-DeBERTa-v3-Large` (roughly 0.4B), its documented
binary support head, eos-concatenated evidence and claim, softmax index 1, and the
published strict `p > .5` threshold. It runs only on English conditions and public
data. This lightweight runner evaluates the whole context once; it does not copy
the official NLTK sentence-chunk/max-aggregation pipeline. Inputs over 2048 tokens
are unavailable. This protocol difference is recorded; do not present results as
an exact reproduction of the published MiniCheck leaderboard. `--device cpu` is a
fallback when Metal is unavailable. Pin `--minicheck-revision <commit>` for archives;
the resolved model commit and resident parameter bytes are recorded.

Optional baselines are probed without installing or changing dependencies:

```sh
uv run --no-sync python -m bench.run run --out bench/results/full --systems alignscore bespoke-7b
```

AlignScore needs an existing compatible package, spaCy English model and the
AlignScore-large checkpoint (`--align-checkpoint <local-path>`). It otherwise
records a skip. The documented Bespoke-7B runtime uses vLLM/CUDA; this lane has no
verified M4 memory-fit implementation and records an explicit skip. Do not invent
numbers, swap in another NLI checkpoint or silently install dependencies.

## GPT comparator (one command)

```sh
uv run --no-sync python -m bench.run run --out bench/results/full --systems gpt --proxy-budget 1700
```

MODEL_FAST and proxy credentials come from root `.env`. Existing v1/v2 prediction
caches are reused only for identical claim/context inputs and matching judge
identity. This is the same prompt and structured schema as `verifier.evaluate`.
New calls run with concurrency 3. The 1700 cap covers up to 300+300+300+500+300
non-real inputs before exact-cache reuse; budget is checked before a suite makes
requests. Real-text suites are explicitly skipped for GPT. Failures are unavailable
observations; only exception types are saved, never server bodies or secrets.

## Aggregate and publication artifacts

```sh
uv run --no-sync python -m bench.run aggregate --out bench/results/full --bootstrap 1000
uv run --no-sync python -m bench.run export --out bench/results/full
```

Outputs are the local `benchmark.json`, per-system prediction JSONL and
`ml/bench/report.md`. To use the required canonical aggregate location, aggregate
without `--out` for the delivered rules run; the full run's aggregate is under
`bench/results/full/benchmark.json`. All files below `bench/results/` are ignored.
The report contains aggregates only. Paper export writes `bench-table.tex`,
`bench_reliability.dat` and `bench_latency.dat`; it leaves numbers pending until a
human review is bound to the exact benchmark SHA-256.

Report macro-F1 over the fixed three labels (zero-division zero), per-class P/R/F1,
binary supported-vs-rest F1, balanced accuracy, coverage and confusion matrices.
Binary F1 is null without supported references; balanced accuracy is null when a
binary reference class is absent. This matters for held-out mutations containing
only negative claims. Binary baselines and public data have no three-class F1.
Every numeric CI uses 1000 seeded cluster bootstrap samples. Cluster unit is patient
for clinical data and document hash for public data; a single real patient's claim
bootstrap is explicitly conditional on that patient. Paired v2-minus-base-1.7B,
v2-minus-base-4B and v2-minus-GPT comparisons require identical input hashes and
reference labels. Their centered-bootstrap p-values are approximate, exploratory
and unadjusted; do not claim confirmatory significance across multiple comparisons.

ECE uses 10 equal-width bins and reports confidence coverage. Qwen probabilities
are uncalibrated closed-set scores; no calibration is fitted here. Reliability data
uses the common binary support space. Local timings exclude model load and use a
validation warm-up for Qwen; proxy timings measure per-request wall time. Cache
hits retain original inference times, not lookup times. First MiniCheck inference
may include backend warm-up. Model bytes are measured only when accessible;
unknown proxy model size stays null. Cost separates API tariff-equivalent per 1000
claims from unmeasured local energy/amortisation. Unknown proxy tariff stays null;
use `--input-usd-per-million` and `--output-usd-per-million` at aggregation only with
verified actual rates. Translation cost remains a separate preparation condition.

For human-approved paper export, create a local review JSON:

```json
{ "reviewedBy": "reviewer's name", "benchmarkSha256": "sha256 of the exact benchmark.json" }
```

```sh
uv run --no-sync python -m bench.run export --out bench/results/full --review /private/tmp/medlyn-bench-review.json
```

The paper lane wires these artifacts. Numeric suite IDs follow `bench.export.SUITES`
in order; system IDs follow `bench.systems.SYSTEMS`. Tables use numeric IDs so no
arbitrary text can enter LaTeX. Empty reliability/latency files have headers only.
The reviewer must check label quality and translation fidelity separately from
measurement correctness; approving a number does not make rule labels human gold.

## Sources and environment

Context7 was unavailable. Primary documentation/source was read instead:

- [MiniCheck model card](https://huggingface.co/lytang/MiniCheck-DeBERTa-v3-Large)
- [MiniCheck inference implementation](https://github.com/Liyan06/MiniCheck/blob/main/minicheck/inference.py)
- [MiniCheck threshold and runtime](https://github.com/Liyan06/MiniCheck/blob/main/minicheck/minicheck.py)
- [LLM-AggreFact dataset and label mapping](https://huggingface.co/datasets/lytang/LLM-AggreFact)
- [AlignScore installation and API](https://github.com/yuh-zha/AlignScore)

The sandbox import probe found torch 2.15.0, transformers 5.22.0 and datasets 5.1.0.
Metal was unavailable and AlignScore was absent. No dependencies were installed
by this lane. GPU model weights, GPT calls, translations, and public downloads
were not executed in the delivered CPU-only rules run.
