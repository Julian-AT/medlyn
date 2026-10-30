"""Render model metadata, evaluation summaries and the exact verifier prompt."""

import json

from verifier.common import SYSTEM

from .selection import BASE, UPSTREAM


def evaluation_table(results):
    lines = [
        "| Suite | Method | n | Macro-F1 | 95% CI | Coverage | p50 ms |",
        "|---|---|---:|---:|---|---:|---:|",
    ]
    for suite, methods in results.get("sets", {}).items():
        for method, values in methods.items():
            ci = values.get("macroF1CI95", {})
            interval = (
                f"[{ci['low']:.4f}, {ci['high']:.4f}] ({ci.get('unit', 'unrecorded')})"
                if ci.get("low") is not None and ci.get("high") is not None
                else "not measured"
            )
            f1 = values.get("macroF1")
            score = f"{f1:.4f}" if isinstance(f1, (int, float)) else "unmeasured"
            latency = values.get("latencyMs", {}).get("p50")
            p50 = f"{latency:.2f}" if isinstance(latency, (int, float)) else "unmeasured"
            lines.append(
                f"| {suite} | {method} | {values.get('n', 0)} | {score} | {interval} | {values.get('coverage', 'unmeasured')} | {p50} |"
            )
    return "\n".join(lines)


def model_card(selection, config, results, evaluation_matches):
    metadata = {
        "license": "apache-2.0",
        "base_model": UPSTREAM,
        "library_name": "mlx",
        "language": ["de", "en"],
        "datasets": ["JulianAT/medlyn-synth-v1"],
        "tags": ["mlx", "lora", "qwen3", "medical", "claim-verification", "synthetic"],
    }
    yaml = "\n".join(f"{key}: {json.dumps(value)}" for key, value in metadata.items())
    training = selection["training"]
    match_note = (
        "The evaluation test input hash matches this adapter's source dataset."
        if evaluation_matches
        else "These are reference experiment results. Their adapter/test identity does not establish measurements for the selected artifact; do not attribute them to this release."
    )
    return f'''---
{yaml}
---

# Medlyn claim verifier — Qwen3-1.7B LoRA

## Summary and intended use

Research adapter for verifying an English clinical claim against German passages and their immediate context. Labels are `supported`, `unsupported`, `contradicted`. This is an MLX LoRA adapter, not a standalone model. Upstream base: `{UPSTREAM}` (Apache 2.0); training used `{BASE}`, a 4-bit MLX conversion. Keep that exact quantised base when loading this adapter.

## Training data and procedure

Synthetic-only training data is released in [medlyn-synth-v1](https://huggingface.co/datasets/JulianAT/medlyn-synth-v1), config `verifier`. Source dataset snapshot: `{selection["data"].name}`. No challenge documents, real-patient examples, predictions or real gold sets are included in training or this release.

Apple-silicon MLX-LM quantised-base LoRA; rank {config.get("lora_parameters", {}).get("rank", "unrecorded")}; adapted layers {config.get("num_layers", "unrecorded")}; max sequence length {config.get("max_seq_length", "unrecorded")}; training examples {training.get("trainExamples", "unrecorded")}; epoch target {training.get("epochTarget", "unrecorded")}; wall seconds {training.get("wallSeconds", "unrecorded")}.

Selection: `{selection["run"]}`, v{selection["version"]}, `{selection["selectionMetric"]}` = {selection["selectionValue"]}. Sweep selection considers completed, fully covered 1.7B runs; 4B runs cannot be packaged as this 1.7B artifact. The v1 fallback chooses the lowest logged validation loss, breaking rounded ties by latest step. Test scores never choose runs or checkpoints.

## Evaluation

The following aggregate measurements are read from `ml/verifier/results.json`. Suites have separate denominators and are never pooled. Confidence intervals are shown only when recorded. Labels are code-checked or weak labels, not human gold; these machine-produced summaries require human review before public scientific claims.

{match_note}

For v1 reports, the test dataset hash is checked but the original report does not record an adapter hash. Exact checkpoint identity is therefore not independently certified by that report.

{evaluation_table(results)}

The real-text rows are aggregate test-only weak-label results; no real examples or prediction files are distributed. Real blind situation results are not read by this exporter. Macro-F1 includes all three classes even where a subset lacks a class. Inspect class support in the source evaluation before interpreting results. Real-regression performance is not established here.

## Load with MLX-LM

```python
from huggingface_hub import snapshot_download
from mlx_lm import load

adapter = snapshot_download("JulianAT/medlyn-verifier-qwen3-1.7b-lora")
model, tokenizer = load("{BASE}", adapter_path=adapter)
```

Apple silicon with working Metal support is required. Authenticate for the private repository before downloading.

## Prompt format

System message (exact training prompt):

```text
{SYSTEM}
```

The user message is JSON with `claim` (English string) and `passages` (list of objects with `text`, nullable `section`, `before`, `after`, `documentDate`). Training assistant responses are JSON with `label`, `assertion`, `timing`. Assertion: present, negated, suspected, historical. Timing: planned, recommended, done, ongoing, given_once, stated.

At inference, use `tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)` then append `{{"label": "`. The repository verifier scores the three candidate label completions by summed token log likelihood, normalised across the closed set. Free-form generation alone does not reproduce its evaluation. Prefixes above 470 tokens are rejected to retain the 512-token training window.

## Limitations

Synthetic-only training and German style templates constrain transfer. Real-text performance is weak; synthetic scores do not establish clinical generalisation. Probabilities are uncalibrated closed-set scores, not clinical confidence. Controlled mutations may create shortcuts, and short contexts can omit relevant evidence. No autonomous clinical use, medical advice or patient-safety certification is implied. Keep Medlyn's location, code, absence and claim-boundary checks; GPT remains the default unless independently held-out results justify promotion.

## Citation

```bibtex
@misc{{medlyn_verifier_2026,
  author = {{Schmidt, Julian}},
  title = {{Medlyn synthetic claim verifier: Qwen3-1.7B LoRA}},
  year = {{2026}},
  url = {{https://huggingface.co/JulianAT/medlyn-verifier-qwen3-1.7b-lora}}
}}
```
'''
