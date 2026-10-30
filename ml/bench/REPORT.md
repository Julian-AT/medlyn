# Verifier benchmark

We measured only the rules and base-1.7b rows below. This benchmark is incomplete,
not independently reviewed, and excluded from headline comparisons and the paper.

No GPU or proxy result is implied by a dry run. Each suite has its own denominator.

| Suite              | System    |   N | Macro-F1 | Coverage |
| :----------------- | :-------- | --: | -------: | -------: |
| synthetic-families | rules     | 300 |   0.2767 |   1.0000 |
| synthetic-families | base-1.7b | 300 |   0.4618 |   1.0000 |
| heldout-mutations  | rules     | 300 |   0.0000 |   1.0000 |
| heldout-mutations  | base-1.7b | 300 |   0.1217 |   1.0000 |
| rewritten-prose    | rules     | 300 |   0.2804 |   1.0000 |
| rewritten-prose    | base-1.7b | 300 |   0.5052 |   1.0000 |
| real-text          | rules     | 100 |   0.3013 |   1.0000 |
| real-text          | base-1.7b | 100 |   0.3813 |   1.0000 |

## System availability

- rules: measured.
- base-1.7b: measured.
- ours-v1: skipped.
- ours-v2: skipped.

## Limits

- No real blind challenge situations are read.
- Real-text set remains not independently annotated; proxy and translation exclude real text.
- Native and English-translated inputs are distinct conditions.
- Binary baselines have no three-class macro-F1.
- MiniCheck uses whole context with eos concatenation, not official sentence chunking; overlength is unavailable.
- Local energy/amortisation cost and unknown proxy tariffs are unmeasured.
- Public data may be gated; no substitute public scores are invented.
- Closed-set local probabilities are uncalibrated; no test calibration fitted.

## Interpretation

Bootstrap intervals and paired deltas are in the local benchmark JSON. Significance tests are exploratory and unadjusted; the centered bootstrap is approximate. Single-patient intervals are conditional on that patient. Held-out mutations are a subset of the family test set and are not independent evidence. Binary F1 treats supported as positive. Missing decisions count against recall and coverage. Binary F1 is undefined without supported references; balanced accuracy is undefined when either binary reference class is absent. Inspect class support before comparing macro-F1. Local probabilities are uncalibrated. Latency uses successful requests only; cache hits retain original timings. These baseline measurements are outside the paper measurement review.

Commands, model sources and publication review are in runbook.md.
