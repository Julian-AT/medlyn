"""Eight configurations, one wall deadline, selection exclusively on validation macro-F1."""

import argparse
import itertools
import json
import random
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .common import LABELS, VERIFIER_DIR, read_jsonl, write_jsonl
from .integrity import file_hash

MODELS = ("mlx-community/Qwen3-1.7B-4bit", "mlx-community/Qwen3-4B-4bit")


def configurations():
    return [
        {"model": model, "rank": rank, "epochs": epochs}
        for model, rank, epochs in itertools.product(MODELS, (8, 16), (1, 2))
    ]


def run_bounded(command, seconds, log):
    with log.open("w") as output:
        process = subprocess.Popen(
            command, stdout=output, stderr=subprocess.STDOUT, start_new_session=True
        )
        try:
            return process.wait(timeout=max(0.01, seconds))
        except subprocess.TimeoutExpired:
            import os
            import signal

            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            return 124


def sweep(data, out, minutes=120, dry_run=False, validation_limit=300, train_limit=1200):
    if not 0 < minutes <= 120 or validation_limit < 3:
        raise ValueError("Sweep cap must be (0,120] minutes and validation limit >=3")
    out.mkdir(parents=True, exist_ok=False)
    started = time.monotonic()
    if train_limit < 3:
        raise ValueError("Training limit must be at least three")
    rows = list(read_jsonl(data / "train.jsonl"))
    groups = {label: [row for row in rows if row["metadata"]["label"] == label] for label in LABELS}
    take = min(train_limit // 3, *(len(group) for group in groups.values()))
    if take < 1:
        raise ValueError("Need all training labels for a balanced sweep subset")
    rng = random.Random(37)
    selected = []
    for group in groups.values():
        rng.shuffle(group)
        selected.extend(group[:take])
    rng.shuffle(selected)
    training_data = out / "sweep-data"
    training_data.mkdir()
    write_jsonl(training_data / "train.jsonl", selected)
    shutil.copyfile(data / "valid.jsonl", training_data / "valid.jsonl")
    configs = configurations()
    records = []
    for index, config in enumerate(configs):
        remaining = minutes * 60 - (time.monotonic() - started)
        run = out / f"run-{index:02d}"
        record = {
            **config,
            "id": run.name,
            "selectionSplit": "valid",
            "validSha256": file_hash(data / "valid.examples.jsonl"),
            "trainExamples": len(selected),
            "trainSubsetSha256": file_hash(training_data / "train.jsonl"),
            "status": "not_run_budget",
        }
        if remaining > 1:
            # Share the remaining deadline fairly; reserve time for serial GPU validation.
            allowance = remaining / (len(configs) - index)
            training_seconds = min(45 * 60, allowance * 0.6)
            command = [
                sys.executable,
                "-m",
                "verifier.train",
                "--data",
                str(training_data),
                "--run",
                str(run),
                "--model",
                config["model"],
                "--rank",
                str(config["rank"]),
                "--epochs",
                str(config["epochs"]),
                "--minutes",
                str(training_seconds / 60),
            ]
            if dry_run:
                command.append("--dry-run")
            code = run_bounded(
                command, training_seconds + (0 if dry_run else 1), out / f"train-{index:02d}.log"
            )
            record["trainExitCode"] = code
            record["status"] = (
                "dry_run"
                if dry_run and code == 0
                else "wall_cap"
                if code == 124
                else "training_failed"
            )
            if not dry_run and code == 0:
                validation = [
                    sys.executable,
                    "-m",
                    "verifier.evaluate",
                    "--version",
                    "2",
                    "--data",
                    str(data),
                    "--split",
                    "valid",
                    "--local",
                    "--model",
                    config["model"],
                    "--adapters",
                    str(run / "adapters"),
                    "--limit",
                    str(validation_limit),
                    "--out",
                    str(run / "validation.json"),
                ]
                code = run_bounded(
                    validation,
                    min(allowance * 0.4, minutes * 60 - (time.monotonic() - started)),
                    out / f"valid-{index:02d}.log",
                )
                record["validationExitCode"] = code
                record["status"] = "validation_wall_cap" if code == 124 else "validation_failed"
                if code == 0:
                    report = json.loads((run / "validation.json").read_text())
                    score = report["sets"]["valid"]["local_qlora"]
                    record.update(
                        status="complete", macroF1=score["macroF1"], coverage=score["coverage"]
                    )
        run.mkdir(parents=True, exist_ok=True)
        (run / "metrics.json").write_text(json.dumps(record, indent=2) + "\n")
        records.append(record)
    eligible = [row for row in records if row["status"] == "complete" and row.get("coverage") == 1]
    winner = max(eligible, key=lambda row: row["macroF1"]) if eligible else None
    result = {
        "status": "dry_run" if dry_run else "complete" if winner else "no_eligible_run",
        "selectionSplit": "valid",
        "wallSeconds": time.monotonic() - started,
        "wallCapSeconds": minutes * 60,
        "runs": records,
        "winner": winner,
    }
    (out / "selection.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=VERIFIER_DIR / "runs/data-v2")
    parser.add_argument(
        "--out", type=Path, default=VERIFIER_DIR / "runs" / time.strftime("sweep-%Y%m%d-%H%M%S")
    )
    parser.add_argument("--minutes", type=float, default=120)
    parser.add_argument("--validation-limit", type=int, default=300)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--train-limit", type=int, default=1200)
    args = parser.parse_args()
    result = sweep(
        args.data.resolve(),
        args.out.resolve(),
        args.minutes,
        args.dry_run,
        args.validation_limit,
        args.train_limit,
    )
    print(json.dumps(result, indent=2))
    if result["status"] == "no_eligible_run":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
