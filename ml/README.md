# Medlyn ML research

Run Python from this directory using the installed uv environment. Root `.env` is the only
configuration source. Bulk inputs, real text, predictions and weights remain ignored.

- [Synthetic generator](synth/README.md): deterministic patient histories and bounded prose rewrites.
- [Verifier runbook](verifier/RUNBOOK.md): ordered CPU checks, data preparation, bounded Mac sweep,
  evaluation and serving commands.
- [Dataset card](verifier/DATASET.md): MedlynBench-synth v1 and the test-only real-text rule set.
- [Model card](verifier/MODEL_CARD.md): model identity, intended use and measured limitations.
- [Results](verifier/RESULTS.md): current measurements and their evaluation identities.

The v2 pipeline builds 24,000 train / 3,000 validation / 3,000 test examples. Rewritten prose is a
separate test family; the local preview has only 30 eligible rewritten patients of the 300 target.
There are 100 real-text rule-labelled claims; their committed manifest contains only counts and
source references. None of those real claims enter training, selection or calibration.

Current scores are the existing pilot predictions reanalysed with v2 statistics. No new MLX
training or inference ran in the sandbox. GPT remains the application's default verifier.
