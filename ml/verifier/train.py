"""Train a bounded MLX LoRA run; dry runs validate inputs without importing MLX."""

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .common import VERIFIER_DIR, read_jsonl
from .integrity import file_hash
from .model import BASE


def train(data, run, model=BASE, rank=8, epochs=1, batch_size=4, minutes=45, dry_run=False):
    if not 0 < minutes <= 45 or rank not in (8, 16) or epochs not in (1, 2) or batch_size < 1:
        raise ValueError("Invalid training budget or configuration")
    rows = list(read_jsonl(data / "train.jsonl"))
    valid = list(read_jsonl(data / "valid.jsonl"))
    if len(rows) < batch_size or not valid:
        raise ValueError("Need nonempty train and validation sets")
    run.mkdir(parents=True, exist_ok=False)
    # The training process receives no test file, even for tokenizer preflight.
    training_data = run / "training-data"
    training_data.mkdir()
    for split in ("train", "valid"):
        shutil.copyfile(data / f"{split}.jsonl", training_data / f"{split}.jsonl")
    config = {"lora_parameters": {"rank": rank, "dropout": 0.0, "scale": 2 * rank}}
    config_path = run / "lora-config.json"
    config_path.write_text(json.dumps(config, indent=2))
    iterations = math.ceil(len(rows) / batch_size) * epochs
    command = [
        sys.executable,
        "-m",
        "mlx_lm.lora",
        "--train",
        "--model",
        model,
        "--data",
        str(training_data),
        "--adapter-path",
        str(run / "adapters"),
        "--config",
        str(config_path),
        "--fine-tune-type",
        "lora",
        "--mask-prompt",
        "--num-layers",
        "8",
        "--batch-size",
        str(batch_size),
        "--iters",
        str(iterations),
        "--learning-rate",
        "0.0001",
        "--max-seq-length",
        "512",
        "--grad-checkpoint",
        "--steps-per-report",
        "10",
        "--steps-per-eval",
        "100",
        "--val-batches",
        "5",
        "--save-every",
        "25",
        "--seed",
        "37",
    ]
    metadata = {
        "command": command,
        "model": model,
        "rank": rank,
        "trainExamples": len(rows),
        "targetIterations": iterations,
        "epochTarget": epochs,
        "wallCapSeconds": minutes * 60,
        "trainSha256": file_hash(data / "train.jsonl"),
        "validSha256": file_hash(data / "valid.jsonl"),
        "status": "dry_run" if dry_run else "running",
    }
    (run / "run.json").write_text(json.dumps(metadata, indent=2))
    if dry_run:
        return metadata
    os.environ.setdefault("HF_HOME", str(VERIFIER_DIR.parent / ".hf"))
    started = time.monotonic()
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(model)
    for name, examples in (("train", rows), ("valid", valid)):
        for row in examples:
            if len(tokenizer.apply_chat_template(row["messages"], return_dict=False)) > 512:
                raise ValueError(f"{name} example exceeds 512 tokens; rebuild shorter context")
    remaining = minutes * 60 - (time.monotonic() - started)
    if remaining <= 0:
        raise TimeoutError("Training preflight exhausted wall cap")
    with (run / "train.log").open("w") as log:
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=os.environ)
        try:
            code = process.wait(timeout=remaining)
            metadata.update(status="complete" if code == 0 else "failed", exitCode=code)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
            metadata.update(status="wall_cap", exitCode=process.returncode)
    metadata["wallSeconds"] = time.monotonic() - started
    (run / "run.json").write_text(json.dumps(metadata, indent=2))
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=VERIFIER_DIR / "runs/data-v2")
    parser.add_argument(
        "--run", type=Path, default=VERIFIER_DIR / "runs" / time.strftime("%Y%m%d-%H%M%S")
    )
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--model", default=BASE)
    parser.add_argument("--rank", type=int, default=8, choices=(8, 16))
    parser.add_argument("--epochs", type=int, default=1, choices=(1, 2))
    parser.add_argument("--minutes", type=float, default=45)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    result = train(
        args.data.resolve(),
        args.run.resolve(),
        args.model,
        args.rank,
        args.epochs,
        args.batch_size,
        args.minutes,
        args.dry_run,
    )
    print(json.dumps(result, indent=2))
    if result["status"] not in ("complete", "dry_run"):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
