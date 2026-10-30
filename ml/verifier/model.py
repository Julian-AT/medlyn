import json
import math
import os
import time

from .common import LABELS, VERIFIER_DIR, messages

BASE = "mlx-community/Qwen3-1.7B-4bit"


class Verifier:
    """Score the three label completions; probabilities are uncalibrated, closed-set scores."""

    def __init__(self, model=BASE, adapters=VERIFIER_DIR / "adapters"):
        os.environ.setdefault("HF_HOME", str(VERIFIER_DIR.parent / ".hf"))
        import mlx.core as mx
        from mlx_lm import load

        self.mx = mx
        if adapters is not None and not (adapters / "adapters.safetensors").exists():
            raise FileNotFoundError(f"Missing trained adapter: {adapters}")
        self.model, self.tokenizer = load(model, adapter_path=str(adapters) if adapters else None)
        self.model.eval()

    def verify(self, claim, passages):
        started = time.perf_counter()
        prompt = (
            self.tokenizer.apply_chat_template(
                messages(claim, passages),
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False,
            )
            + '{"label": "'
        )
        prefix = self.tokenizer.encode(prompt, add_special_tokens=False)
        if len(prefix) > 470:
            raise ValueError("Claim and passages exceed the trained 512-token window")
        scores = []
        for label in LABELS:
            full = self.tokenizer.encode(prompt + label + '"', add_special_tokens=False)
            if full[: len(prefix)] != prefix:
                raise ValueError("Tokenizer prefix boundary changed")
            tokens = self.mx.array([full])
            logits = self.model(tokens[:, :-1]).astype(self.mx.float32)
            logprobs = logits - self.mx.logsumexp(logits, axis=-1, keepdims=True)
            positions = self.mx.arange(len(prefix) - 1, len(full) - 1)
            targets = tokens[0, len(prefix) :]
            score = logprobs[0, positions, targets].sum()
            self.mx.eval(score)
            scores.append(float(score.item()))
        maximum = max(scores)
        weights = [math.exp(score - maximum) for score in scores]
        probabilities = {label: weight / sum(weights) for label, weight in zip(LABELS, weights)}
        label = max(probabilities, key=probabilities.get)
        self.mx.clear_cache()
        return {
            "label": label,
            "probability": probabilities[label],
            "probabilities": probabilities,
            "latencyMs": (time.perf_counter() - started) * 1000,
            "probabilityKind": "uncalibrated_closed_set_sequence_score",
        }


def validate_request(payload):
    if not isinstance(payload, dict):
        raise TypeError("Expected an object")
    claim, passages = payload.get("claim"), payload.get("passages")
    if not isinstance(claim, str) or not claim.strip() or len(claim) > 4000:
        raise ValueError("claim must be a nonempty string of at most 4000 characters")
    if not isinstance(passages, list) or not 1 <= len(passages) <= 8:
        raise ValueError("passages must contain 1–8 source objects")
    for passage in passages:
        if not isinstance(passage, dict) or not isinstance(passage.get("text"), str):
            raise TypeError("Each passage needs text")
        if not passage["text"].strip():
            raise ValueError("Empty source passage")
        if passage.get("section") is not None and not isinstance(passage["section"], str):
            raise ValueError("section must be a string or null")
        for key in ("before", "after"):
            value = passage.get(key, [])
            if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
                raise ValueError(f"{key} must be a string list")
    if len(json.dumps(payload)) > 32000:
        raise ValueError("Evidence payload is too large")
    return claim, passages
