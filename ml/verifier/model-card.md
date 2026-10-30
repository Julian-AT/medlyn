# Medlyn local claim verifier model card

We evaluate a research verifier and a validation-selected cascade. GPT remains the
application semantic verifier; the local model is not promoted for clinical use.

## Base and adaptation

We use `mlx-community/Qwen3-1.7B-4bit`, a quantised conversion of
[Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B), with MLX LoRA on Apple silicon.
Upstream weights declare Apache-2.0; retain the conversion and adapter provenance.
The selected configuration uses rank 16 and a one-epoch target. The full-data run
hit its 45-minute wall cap before completing the epoch. A saved checkpoint, not a
completed epoch, supplies the reported inference results. Local run/configuration
files retain hashes and the actual stop status; adapters and weights stay ignored.

The dataset contains 24,000 training, 3,000 validation and 3,000 test examples.
Patient/family splits precede adaptation. We bound sequences at 512 tokens and mask
prompts. Test-only real-text rule labels never enter training or calibration.

## Scoring and calibration

We score supported, unsupported and contradicted label completions against an English
claim and cited German passages with context. Closed-set sequence scores are not
clinical probabilities. Temperature scaling and the acceptance threshold use validation
only. The cascade accepts qualifying high-confidence local decisions and otherwise
routes to GPT. Missing identity, calibration or inference results cannot count as local
acceptance. The shared production claim boundary retains its evidence, location and
absence checks; research thresholds do not provide a clinical error guarantee.

## Measurements

| Population             | Local macro-F1 | GPT macro-F1 | Cascade macro-F1 |
| :--------------------- | -------------: | -----------: | ---------------: |
| Synthetic held-out     |          0.764 |        0.896 |            0.956 |
| Rewritten synthetic    |          0.842 |        0.908 |            0.939 |
| Real text, rule labels |          0.421 |        0.657 |            0.616 |

Source: [results.json](results.json); [comparison details](RESULTS.md). The synthetic
cascade projects 55% fewer GPT calls in offline replay with both methods executed.
This is not a measured live reduction. The cascade and local verifier trail GPT on
real text. Macro-F1 averages all labels, including absent classes. Real-text intervals
are conditional on the sampled patient, not clinical population uncertainty.

## Intended use and limitations

We study bounded claim-support classification. Synthetic templates, mutation families,
bilingual rendering and rule-derived labels limit transfer. The file label `real-gold`
does not imply clinician gold. We have no independent clinical validation, production
promotion or cascade regression claim. Failure tags are automatic and not independently
annotated. See the [runbook](RUNBOOK.md) for reproducibility and identity checks.
