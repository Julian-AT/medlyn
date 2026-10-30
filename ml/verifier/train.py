"""Run one QLoRA epoch with a hard 45-minute subprocess deadline."""

import argparse
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

from .common import VERIFIER_DIR, read_jsonl
from .model import BASE


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=VERIFIER_DIR / "datasets")
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--model", default=BASE)
    parser.add_argument("--minutes", type=float, default=45)
    args = parser.parse_args()
    if not 0 < args.minutes <= 45 or args.batch_size < 1:
        parser.error("deadline must be (0,45] minutes; batch size must be positive")
    rows = list(read_jsonl(args.data / "train.jsonl"))
    valid = list(read_jsonl(args.data / "valid.jsonl"))
    if len(rows) < args.batch_size or not valid:
        raise SystemExit("Need nonempty training and validation sets before training")
    os.environ.setdefault("HF_HOME", str(VERIFIER_DIR.parent / ".hf"))
    # MLX truncates sequences. Reject beforehand so a truncated answer never becomes a label.
    from transformers import AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    for name in ("train", "valid", "test"):
        for row in read_jsonl(args.data / f"{name}.jsonl"):
            if len(tokenizer.apply_chat_template(row["messages"], return_dict=False)) > 512:
                raise SystemExit(f"{name} example exceeds 512 tokens; rebuild with smaller context")
    iterations = math.ceil(len(rows) / args.batch_size)
    run = VERIFIER_DIR / "runs" / time.strftime("%Y%m%d-%H%M%S")
    run.mkdir(parents=True)
    command = [
        sys.executable,
        "-m",
        "mlx_lm.lora",
        "--train",
        "--model",
        args.model,
        "--data",
        str(args.data),
        "--adapter-path",
        str(VERIFIER_DIR / "adapters"),
        "--fine-tune-type",
        "lora",
        "--mask-prompt",
        "--num-layers",
        "8",
        "--batch-size",
        str(args.batch_size),
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
    started = time.monotonic()
    metadata = {
        "command": command,
        "trainExamples": len(rows),
        "targetIterations": iterations,
        "epochTarget": 1,
        "wallCapSeconds": args.minutes * 60,
        "status": "running",
    }
    (run / "run.json").write_text(json.dumps(metadata, indent=2))
    print(str(run), flush=True)
    with (run / "train.log").open("w") as log:
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT, env=os.environ)
        try:
            result = process.wait(timeout=args.minutes * 60)
            metadata.update(status="complete" if result == 0 else "failed", exitCode=result)
        except subprocess.TimeoutExpired:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            metadata.update(status="wall_cap", exitCode=process.returncode)
    metadata["wallSeconds"] = time.monotonic() - started
    (run / "run.json").write_text(json.dumps(metadata, indent=2))
    print(json.dumps(metadata, indent=2))
    if metadata["status"] == "failed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
