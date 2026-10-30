# Verifier benchmark

Run status: measured. Human measurement review: pending.

No GPU or proxy result is implied by a dry run. Each suite has its own denominator.

| Suite              | System |   N | Macro-F1 | Binary F1 | Balanced accuracy | Coverage |
| ------------------ | ------ | --: | -------: | --------: | ----------------: | -------: |
| synthetic-families | rules  | 300 |   0.2976 |    0.7092 |            0.7950 |   1.0000 |
| heldout-mutations  | rules  | 300 |   0.0000 | undefined |         undefined |   1.0000 |
| rewritten-prose    | rules  | 300 |   0.2878 |    0.7067 |            0.7925 |   1.0000 |
| real-text          | rules  | 100 |   0.3013 |    0.9038 |            0.9000 |   1.0000 |

## System availability

- rules: measured.
- base-1.7b: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- base-4b: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- ours-v1: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- ours-v2: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- gpt: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- minicheck: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- alignscore: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.
- bespoke-7b: dry_run.
  - synthetic-families: not_executed.
  - heldout-mutations: not_executed.
  - rewritten-prose: not_executed.
  - real-text: not_executed.

## Limits

- No real blind challenge situations are read.
- Real-text set remains human-review-pending; proxy and translation exclude real text.
- Native and English-translated inputs are distinct conditions.
- Binary baselines have no three-class macro-F1.
- MiniCheck uses whole context with eos concatenation, not official sentence chunking; overlength is unavailable.
- Local energy/amortisation cost and unknown proxy tariffs are unmeasured.
- Public data may be gated; no substitute public scores are invented.
- Closed-set local probabilities are uncalibrated; no test calibration fitted.

## Interpretation

Bootstrap intervals and paired deltas are in the local benchmark JSON. Significance tests are exploratory and unadjusted; the centered bootstrap is approximate. Single-patient intervals are conditional on that patient. Held-out mutations are a subset of the family test set and are not independent evidence. Binary F1 treats supported as positive. Missing decisions count against recall and coverage. Binary F1 is undefined without supported references; balanced accuracy is undefined when either binary reference class is absent. Inspect class support before comparing macro-F1. Local probabilities are uncalibrated. Latency uses successful requests only; cache hits retain original timings. No measured result has been human-approved for the paper.

Commands, model sources and publication review are in RUNBOOK.md.
