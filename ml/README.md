# Medlyn ML research

Run Python from this directory with uv and the installed environment. Root `.env`
is the only configuration source. Source text, bulk synthetic data, predictions,
adapters and weights remain local and ignored.

| Area                 | Documentation                                                                                        |
| :------------------- | :--------------------------------------------------------------------------------------------------- |
| Synthetic corpus     | [Generation, materialisation, rewrites and PDF fixtures](synth/README.md)                            |
| Verifier             | [Runbook](verifier/RUNBOOK.md), [dataset](verifier/DATASET.md), [model card](verifier/model-card.md) |
| Measured comparison  | [Results](verifier/RESULTS.md) and [numeric aggregates](verifier/results.json)                       |
| Quantum              | [Offline control and IBM hardware experiment](quantum/README.md)                                     |
| Additional baselines | [Incomplete benchmark scope](bench/REPORT.md)                                                        |

The final verifier dataset has 24,000 train, 3,000 validation and 3,000 test examples;
the evaluation uses bounded subsets and a separate rewritten family. Real-text claims
are test-only rule labels and never enter training or calibration. The full-data MLX
run hit its time cap; its saved checkpoint was evaluated. Results include calibrated
local scores, GPT and an offline cascade. GPT remains the application's default
semantic verifier; research savings are routing projections.

```sh
uv run --no-sync ruff check .
uv run --no-sync python -m pytest
uv run --no-sync python -m synth.generate --help
uv run --no-sync python -m verifier.evaluate --help
```

Use the runbooks for data preparation and GPU commands. Do not rerun training or
network evaluations during submission checks. The paper reads frozen aggregate
results, not patient text or live services.
