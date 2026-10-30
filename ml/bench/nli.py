"""English-only baselines. Scores are binary and never fabricated three-way probabilities."""

import importlib.util

from .io import context
from .systems import available_metadata


def binary_result(p):
    if not 0 <= p <= 1:
        raise ValueError("Invalid NLI score")
    return {
        "label": "supported" if p > 0.5 else "not_supported",
        "probabilities": {"supported": p, "not_supported": 1 - p},
    }


def load_nli(name, args):
    if name == "alignscore":
        if not importlib.util.find_spec("alignscore") or not args.align_checkpoint:
            raise RuntimeError(
                "Skipped: AlignScore needs optional package, spaCy English model and checkpoint; no dependencies installed by this lane"
            )
        from alignscore import AlignScore

        scorer = AlignScore(
            model="roberta-large",
            batch_size=1,
            device=args.device,
            ckpt_path=str(args.align_checkpoint),
            evaluation_mode="nli_sp",
        )
        from verifier.integrity import file_hash

        meta = available_metadata(name, "AlignScore-large")
        meta["checkpointSha256"] = file_hash(args.align_checkpoint)
        return (
            lambda row: {
                "label": binary_result(
                    float(scorer.score(contexts=[context(row)], claims=[row["claim"]])[0])
                )["label"]
            },
            meta,
            lambda: None,
        )
    import torch
    from transformers import AutoModelForSequenceClassification, AutoTokenizer

    model_id = "lytang/MiniCheck-DeBERTa-v3-Large"
    tokenizer = AutoTokenizer.from_pretrained(model_id, revision=args.minicheck_revision)
    model = AutoModelForSequenceClassification.from_pretrained(
        model_id, revision=args.minicheck_revision
    ).to(args.device)
    model.eval()
    meta = available_metadata(name, model_id)
    meta["device"] = args.device
    meta.update(
        sizeBytes=sum(p.numel() * p.element_size() for p in model.parameters()),
        revision=getattr(model.config, "_commit_hash", None),
        protocol="whole-context eos claim; >2048 tokens unavailable; fixed threshold .5; no chunking",
    )

    def predict(row):
        # Match official MiniCheck eos-concatenation; never silently truncate evidence.
        text = tokenizer.eos_token.join([context(row), row["claim"]])
        tokens = tokenizer(text, return_tensors="pt", truncation=False)
        if tokens["input_ids"].shape[-1] > 2048:
            raise ValueError("MiniCheck input exceeds 2048 tokens")
        tokens = {k: v.to(args.device) for k, v in tokens.items()}
        with torch.inference_mode():
            probability = float(torch.softmax(model(**tokens).logits.float(), dim=-1)[0, 1].item())
        return binary_result(probability)

    return predict, meta, lambda: None
