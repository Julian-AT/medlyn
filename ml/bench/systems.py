"""Serial model loading: one model at a time on the 24 GB reference machine."""

import importlib.util
import json
import os
import platform

from verifier.common import ROOT, Bridge
from verifier.evaluate import proxy
from verifier.integrity import file_hash
from verifier.model import Verifier

from .io import digest, read
from .suites import assert_disjoint

SYSTEMS = (
    "rules",
    "base-1.7b",
    "base-4b",
    "ours-v1",
    "ours-v2",
    "gpt",
    "minicheck",
    "alignscore",
    "bespoke-7b",
)


def available_metadata(name, model=None, adapters=None):
    return {
        "system": name,
        "model": model,
        "adapterHashes": {p.name: file_hash(p) for p in adapters.glob("*") if p.is_file()}
        if adapters
        else {},
        "hardware": {
            "machine": platform.machine(),
            "processor": platform.processor(),
            "system": platform.system(),
        },
        "declaredParametersBillions": {
            "base-1.7b": 1.7,
            "base-4b": 4,
            "ours-v1": 1.7,
            "minicheck": 0.4,
        }.get(name),
        "quantizationBits": 4 if name.startswith(("base-", "ours-")) else None,
        "sizeBytes": None,
        "timing": "serial warm per-claim wall clock; model load excluded",
    }


def load(name, args):
    if name == "rules":
        bridge = Bridge()
        bridge.call(op="rules", claim="Warmup", sources=["Warmup"])
        return (
            lambda row: {
                "label": "supported"
                if bridge.call(
                    op="rules",
                    claim=row["claim"],
                    sources=[json.dumps(p, ensure_ascii=False) for p in row["passages"]],
                )["ok"]
                else "unsupported"
            },
            available_metadata(name),
            bridge.close,
        )
    if name == "gpt":
        if not os.environ.get("MODEL_FAST"):
            raise ValueError("MODEL_FAST missing")
        meta = available_metadata(name, os.environ["MODEL_FAST"])
        meta["timing"] = (
            "per-request wall clock; concurrency 3; cache preserves original request timing"
        )
        meta["endpointHash"] = digest(os.environ.get("OPENAI_BASE_URL", "http://localhost:8317/v1"))
        return proxy, meta, lambda: None
    if name in ("minicheck", "alignscore"):
        from .nli import load_nli

        return load_nli(name, args)
    if name == "bespoke-7b":
        raise RuntimeError(
            "Skipped: official Bespoke runtime requires vLLM/CUDA; no verified M4 memory-fit path"
        )
    adapters = None
    model = "mlx-community/Qwen3-4B-4bit" if name == "base-4b" else "mlx-community/Qwen3-1.7B-4bit"
    if name == "ours-v1":
        adapters = args.v1_adapters
        training = read(args.v1_data / "train.examples.jsonl")
        testing = [
            row
            for suite, rows in args.frozen_suites.items()
            if suite in ("synthetic-families", "rewritten-prose")
            for row in rows
        ]
        assert_disjoint(testing, training)
    if name == "ours-v2":
        selection = json.loads(args.selection.read_text())
        winner = selection.get("winner")
        if (
            selection.get("selectionSplit") != "valid"
            or not winner
            or winner.get("status") != "complete"
            or winner.get("coverage") != 1
        ):
            raise ValueError("Need a completed validation-only sweep winner")
        expected = args.suite_manifest["developmentHashes"]["valid"]
        if winner["validSha256"] != expected:
            raise ValueError("Sweep validation identity does not match benchmark")
        training_path = args.selection.parent / "sweep-data/train.jsonl"
        if winner.get("trainSubsetSha256") != file_hash(training_path):
            raise ValueError("Sweep training subset changed")
        training = []
        for row in read(training_path):
            payload = json.loads(row["messages"][1]["content"])
            training.append({**row["metadata"], **payload})
        testing = [
            row
            for suite, rows in args.frozen_suites.items()
            if suite in ("synthetic-families", "rewritten-prose")
            for row in rows
        ]
        assert_disjoint(testing, training)
        model = winner["model"]
        adapters = args.selection.parent / winner["id"] / "adapters"
    if not importlib.util.find_spec("mlx_lm"):
        raise RuntimeError("MLX-LM unavailable")
    verifier = Verifier(model, adapters)
    meta = available_metadata(name, model, adapters)
    ref = ROOT / "ml/.hf/hub" / ("models--" + model.replace("/", "--")) / "refs/main"
    meta["baseRevision"] = ref.read_text().strip() if ref.exists() else None
    if meta["baseRevision"]:
        snapshot = ref.parent.parent / "snapshots" / meta["baseRevision"]
        weight_files = list(snapshot.glob("*.safetensors"))
        meta["sizeBytes"] = sum(p.stat().st_size for p in weight_files) if weight_files else None
    if name == "ours-v1":
        meta["trainingExamplesHash"] = file_hash(args.v1_data / "train.examples.jsonl")
    if name == "ours-v2":
        meta["trainingSubsetHash"] = winner["trainSubsetSha256"]
        meta["selectionSha256"] = file_hash(args.selection)
        meta["declaredParametersBillions"] = 4 if "Qwen3-4B" in model else 1.7
    meta["adapterSizeBytes"] = (
        sum(p.stat().st_size for p in adapters.glob("*.safetensors")) if adapters else 0
    )
    # Use development data for one unmeasured warm-up; inference never fits a parameter.
    warmup = read(args.data / "valid.examples.jsonl")[0]
    verifier.verify(warmup["claim"], warmup["passages"])
    meta["warmup"] = "one validation claim, excluded from timing"
    return lambda row: verifier.verify(row["claim"], row["passages"]), meta, lambda: None
