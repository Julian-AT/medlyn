"""Select compatible completed adapters using validation metrics, never test scores."""

import math
import re
from pathlib import Path

from .common import read_json, sha256

BASE = "mlx-community/Qwen3-1.7B-4bit"
UPSTREAM = "Qwen/Qwen3-1.7B"


def adapter_files(folder):
    weights, config = folder / "adapters.safetensors", folder / "adapter_config.json"
    if not weights.is_file() or not config.is_file() or weights.is_symlink() or config.is_symlink():
        raise ValueError("Completed adapter weights and configuration are required")
    if read_json(config).get("model") != BASE:
        raise ValueError("This release is exclusively for the Qwen3-1.7B 4-bit training base")
    return weights, config


def select_adapter(verifier):
    selections = sorted((verifier / "runs").glob("**/selection.json"))
    candidates = []
    for path in selections:
        selection = read_json(path)
        if selection.get("selectionSplit") != "valid":
            raise ValueError("Sweep selection must use validation data exclusively")
        for run in selection.get("runs", []):
            score = run.get("macroF1")
            if run.get("status") != "complete" or run.get("model") != BASE:
                continue
            if run.get("selectionSplit") != "valid" or run.get("coverage") != 1:
                continue
            if (
                not isinstance(score, (int, float))
                or not math.isfinite(score)
                or not 0 <= score <= 1
            ):
                continue
            folder = (path.parent / run["id"]).resolve()
            if not folder.is_relative_to((verifier / "runs").resolve()):
                raise ValueError("Sweep run escapes the verifier runs directory")
            weights, config = adapter_files(folder / "adapters")
            metadata = read_json(folder / "run.json")
            if metadata.get("status") != "complete":
                continue
            data = verifier / "runs/data-v2"
            if run.get("validSha256") != sha256(data / "valid.examples.jsonl"):
                raise ValueError("Sweep validation examples changed after selection")
            candidates.append(
                (
                    score,
                    str(folder),
                    {
                        "weights": weights,
                        "config": config,
                        "data": data,
                        "run": folder.name,
                        "selectionMetric": "validation_macro_f1",
                        "selectionValue": score,
                        "version": 2,
                        "training": metadata,
                    },
                )
            )
    if candidates:
        return max(candidates, key=lambda candidate: candidate[:2])[2]
    if any(read_json(path).get("status") != "dry_run" for path in selections):
        raise ValueError("V2 sweep exists but has no completed, fully covered 1.7B validation run")
    for path in sorted((verifier / "runs").glob("*/run.json")):
        metadata = read_json(path)
        if metadata.get("status") != "complete":
            continue
        command = metadata.get("command", [])
        if "--adapter-path" not in command:
            continue
        folder = Path(command[command.index("--adapter-path") + 1]).resolve()
        if not folder.is_relative_to(verifier.resolve()):
            raise ValueError("Adapter path escapes verifier directory")
        weights, config = adapter_files(folder)
        log = re.sub(r"\x1b\[[0-9;]*m", "", (path.parent / "train.log").read_text())
        values = [
            (float(loss), -int(step))
            for step, loss in re.findall(r"^\s*(\d+)\s+val\s+(\d+(?:\.\d+)?)", log, re.MULTILINE)
        ]
        if not values:
            continue
        loss, negative_step = min(values)
        step = -negative_step
        if step != metadata.get("targetIterations"):
            weights = folder / f"{step:07d}_adapters.safetensors"
            if not weights.is_file():
                raise ValueError("Best validation checkpoint is unavailable")
        candidates.append(
            (
                -loss,
                str(path),
                {
                    "weights": weights,
                    "config": config,
                    "data": verifier / "datasets",
                    "run": path.parent.name,
                    "selectionMetric": "logged_validation_loss_rounded",
                    "selectionValue": loss,
                    "step": step,
                    "version": 1,
                    "training": metadata,
                },
            )
        )
    if not candidates:
        raise ValueError("No completed compatible run with validation measurements exists")
    return max(candidates, key=lambda candidate: candidate[:2])[2]
