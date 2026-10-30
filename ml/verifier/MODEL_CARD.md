# Medlyn local claim verifier model card

Status: research prototype. The v2 pipeline is implemented and CPU-tested. V2 GPU training,
validation-selected weights and cascade regression measurements await the orchestrator's Mac run.

## Base and adaptation

The pilot uses `mlx-community/Qwen3-1.7B-4bit`. The sweep also attempts
`mlx-community/Qwen3-4B-4bit`, LoRA ranks 8/16 and 1/2 epochs, with eight adapted layers,
prompt masking, learning rate 1e-4, seed 37, batch size 4 and sequences at most 512 tokens.
This is MLX quantised-base LoRA on Apple silicon. It is not a CUDA bitsandbytes run.

The upstream [Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B),
[Qwen3-4B](https://huggingface.co/Qwen/Qwen3-4B) and
[MLX 4B conversion](https://huggingface.co/mlx-community/Qwen3-4B-4bit) cards declare Apache-2.0
(checked 30 Oct 2026). Each run records its exact model, quantisation identifier, rank, epochs,
training subset hash, validation hash and command. Verifier identity includes the cached base
revision when present, adapter/config hashes, scoring version and prompt hash. Keep those local
artifacts with the result; adapters are not committed.

## Inputs, scoring and calibration

Inputs are one English claim and up to eight cited German passages with headings, dates and
neighbouring segments. The scorer sums label-completion log-likelihoods with thinking disabled,
then normalises over supported/unsupported/contradicted. These are closed-set sequence scores.
Temperature scaling minimises validation negative log likelihood over a fixed grid. It never
uses test labels. ECE and reliability bins report calibration only where confidence is available.

A validation-only threshold maximises accepted share subject to the configured empirical error
limit (default 2%) and at least 20 accepted validation claims. With no qualifying threshold,
local acceptance is disabled. This empirical condition is not a clinical error guarantee.
The cascade requires a matching model, validation hash and temperature; errors, overlong requests,
uncalibrated scores and low confidence escalate to the existing GPT semantic judge.

## Measurements and intended use

`results.json` contains the old pilot predictions reanalysed with v2 statistics. On the 90-example
synthetic pilot, macro-F1 was 0.754 local, 0.898 GPT and 0.287 rules. These measurements are not
v2 training results. The local pilot's synthetic ECE is about 0.191 before temperature scaling.
Intervals, class supports, mutation confusion and historical request latencies are in the report.
Real cached letter claims use weak, judge-derived labels and have a separate denominator; inspect
their class supports before comparing macro-F1.

No new trained adapter, calibrated cascade savings or 15/15 cascade regression result is claimed.
The current application remains GPT by default. Integration belongs inside the shared claim
boundary, after eligibility/location/code checks, with the full cache identity extended to include
the policy and model. Template rendering and proven absence must retain their own checks.

This model is intended for controlled research into claim support. It is not validated for
independent clinical decisions. Artificial negative families, bilingual template translation,
closed label choices, one real patient and engine-derived positive labels limit external validity.
Real text is never used for training or calibration. GPU evaluation must yield to the regression
and demo, and optional assertion classification is deferred.
