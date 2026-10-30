"""Run a system on frozen populations, or aggregate saved predictions only."""

import argparse
import gc
import json
import os
import platform
import time
from pathlib import Path

from verifier.common import ROOT, SYSTEM
from verifier.evaluate import load_env
from verifier.integrity import file_hash

from .cache import evaluate, legacy_proxy
from .costs import costs
from .inference import intervals, paired
from .io import BENCH, digest, ignored_directory, input_identity, read, write_json
from .metrics import summarize
from .suites import load_suites, prepare
from .systems import SYSTEMS, load


def code_identity():
    paths = [
        *BENCH.glob("*.py"),
        *(ROOT / "ml/verifier").glob("*.py"),
        ROOT / "packages/engine/claims/code-check.ts",
    ]
    return digest({str(p.relative_to(ROOT)): file_hash(p) for p in paths})


def run_system(args):
    manifest, suites = load_suites(args.out)
    args.suite_manifest = manifest
    args.frozen_suites = suites
    code_hash = code_identity()
    index_path = args.out / "systems.json"
    index = json.loads(index_path.read_text()) if index_path.exists() else {}
    for name in args.systems:
        if args.dry_run:
            index[name] = {
                "status": "dry_run",
                "suites": {
                    s: {"status": "not_executed", "n": len(rows)} for s, rows in suites.items()
                },
            }
            continue
        try:
            predict, meta, close = load(name, args)
        except (ImportError, OSError, RuntimeError, ValueError, KeyError) as error:
            index[name] = {
                "status": "skipped",
                "reason": type(error).__name__,
                "detail": str(error)[:220]
                if name in ("alignscore", "bespoke-7b")
                else "Model, dependencies, credentials or validation-selected adapter unavailable",
            }
            continue
        identity = digest({"metadata": meta, "prompt": SYSTEM, "code": code_hash})
        entry = {
            "status": "measured",
            "identity": identity,
            "metadata": meta,
            "suiteManifestHash": file_hash(args.out / "suites.json"),
            "codeIdentity": code_hash,
            "suites": {},
        }
        remaining = args.proxy_budget
        legacy = (
            legacy_proxy(
                [ROOT / "ml/verifier/datasets/proxy-cache.jsonl", args.data / "proxy-cache.jsonl"]
            )
            if name == "gpt"
            else {}
        )
        try:
            for suite, rows in suites.items():
                if not rows:
                    entry["suites"][suite] = {"status": "empty"}
                    continue
                # Real clinical source text cannot be sent to any external service.
                if suite.startswith("real-text") and name == "gpt":
                    entry["suites"][suite] = {"status": "skipped_real_text_stays_local"}
                    continue
                if name in ("minicheck", "alignscore") and not all(
                    r.get("language") == "en" for r in rows
                ):
                    entry["suites"][suite] = {"status": "skipped_requires_english_condition"}
                    continue
                path = args.out / f"predictions-{suite}-{name}.jsonl"
                values = evaluate(
                    rows,
                    predict,
                    identity,
                    path,
                    legacy=legacy,
                    budget=remaining if name == "gpt" else None,
                    workers=3 if name == "gpt" else 1,
                )
                if name == "gpt":
                    remaining -= sum(not r["cacheHit"] for r in values)
                entry["suites"][suite] = {
                    "status": "measured",
                    "predictions": path.name,
                    "predictionsSha256": file_hash(path),
                    "suiteSha256": manifest["suites"][suite]["sha256"],
                    "n": len(values),
                    "binaryOnly": name in ("minicheck", "alignscore")
                    or manifest["suites"][suite]["binaryOnly"],
                }
        finally:
            close()
            del predict
            gc.collect()
        index[name] = entry
        write_json(index_path, index)
    write_json(index_path, index)
    return index


def aggregate(args):
    manifest, suites = load_suites(args.out)
    index_path = args.out / "systems.json"
    systems = json.loads(index_path.read_text()) if index_path.exists() else {}
    report = {
        "version": 1,
        "status": "dry_run" if args.dry_run else "measured",
        "createdAtUnix": time.time(),
        "host": {
            "platform": platform.platform(),
            "machine": platform.machine(),
            "referenceHardware": "M4 Pro only when executed and confirmed on that host",
        },
        "protocol": {
            "seed": 37,
            "bootstrapReplicates": args.bootstrap,
            "noTestTuning": True,
            "latency": "local serial, proxy concurrency 3; request wall time excluding queue/load; cache preserves original timing",
            "significance": "paired cluster bootstrap, centered two-sided approximate p; unadjusted exploratory tests",
            "binaryPositive": "supported",
            "missingPredictions": "retained as errors, never mapped to not_supported",
            "humanReview": "pending; synthetic rule labels and translations are not human gold",
        },
        "suiteIdentity": manifest,
        "systems": systems,
        "sets": {},
        "paired": {},
        "limitations": [
            "No real blind challenge situations are read",
            "Real-text set remains human-review-pending; proxy and translation exclude real text",
            "Native and English-translated inputs are distinct conditions",
            "Binary baselines have no three-class macro-F1",
            "MiniCheck uses whole context with eos concatenation, not official sentence chunking; overlength is unavailable",
            "Local energy/amortisation cost and unknown proxy tariffs are unmeasured",
            "Public data may be gated; no substitute public scores are invented",
            "Closed-set local probabilities are uncalibrated; no test calibration fitted",
        ],
    }
    predictions = {}
    for name, entry in systems.items():
        for suite, meta in entry.get("suites", {}).items():
            if meta["status"] != "measured":
                continue
            if meta["suiteSha256"] != manifest["suites"][suite]["sha256"]:
                raise ValueError("Prediction population is stale")
            path = args.out / meta["predictions"]
            if file_hash(path) != meta["predictionsSha256"]:
                raise ValueError("Prediction artifact changed after measurement")
            source = {input_identity(r): r for r in suites[suite]}
            rows = [
                r
                for r in read(path)
                if r.get("systemIdentity") == entry["identity"] and r["inputHash"] in source
            ]
            if (
                len(rows) != len(source)
                or len({r["inputHash"] for r in rows}) != len(source)
                or any(r["label"] != source[r["inputHash"]]["label"] for r in rows)
            ):
                raise ValueError("Incomplete, duplicate or relabelled predictions")
            predictions[(suite, name)] = rows
            result = {
                **summarize(rows, meta["binaryOnly"]),
                "ci95": intervals(rows, meta["binaryOnly"], args.bootstrap),
                "cost": costs(
                    rows, name == "gpt", args.input_usd_per_million, args.output_usd_per_million
                ),
            }
            report["sets"].setdefault(suite, {})[name] = result
    for suite in suites:
        ours = predictions.get((suite, "ours-v2"))
        if not ours:
            continue
        for baseline in ("base-1.7b", "base-4b", "gpt"):
            other = predictions.get((suite, baseline))
            if other:
                report["paired"].setdefault(suite, {})[baseline] = paired(
                    ours, other, manifest["suites"][suite]["binaryOnly"], args.bootstrap
                )
    if not report["sets"] and not args.dry_run:
        report["status"] = "unmeasured"
    write_json(args.out / "benchmark.json", report)
    from .report import markdown

    markdown(report, BENCH / "report.md")
    return report


def parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=("prepare", "translate", "run", "aggregate", "export"))
    p.add_argument("--out", type=Path, default=BENCH / "results")
    p.add_argument("--data", type=Path, default=ROOT / "ml/verifier/runs/data-v2")
    p.add_argument("--limit", type=int, default=300)
    p.add_argument("--real", type=Path)
    p.add_argument("--public", action="store_true")
    p.add_argument("--public-revision", default="main")
    p.add_argument("--systems", nargs="+", choices=SYSTEMS, default=list(SYSTEMS))
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--selection", type=Path, default=ROOT / "ml/verifier/runs/sweep/selection.json")
    p.add_argument("--v1-data", type=Path, default=ROOT / "ml/verifier/datasets")
    p.add_argument("--v1-adapters", type=Path, default=ROOT / "ml/verifier/adapters")
    p.add_argument("--proxy-budget", type=int, default=300)
    p.add_argument("--bootstrap", type=int, default=1000)
    p.add_argument("--device", default="cpu")
    p.add_argument("--minicheck-revision", default="main")
    p.add_argument("--align-checkpoint", type=Path)
    p.add_argument("--input-usd-per-million", type=float)
    p.add_argument("--output-usd-per-million", type=float)
    p.add_argument("--review", type=Path)
    return p


def main():
    args = parser().parse_args()
    if (
        args.bootstrap < 1
        or args.proxy_budget < 0
        or any(
            v is not None and v < 0
            for v in (args.input_usd_per_million, args.output_usd_per_million)
        )
    ):
        raise ValueError("Invalid bootstrap, budget or pricing")
    args.out = ignored_directory(args.out)
    os.environ.setdefault("HF_HOME", str(ROOT / "ml/.hf"))
    load_env()
    if args.command == "prepare":
        if (args.out / "suites.json").exists():
            raise ValueError("Suites already frozen; choose a new ignored --out directory")
        result = prepare(
            args.data, args.out, args.limit, args.real, args.public, args.public_revision
        )
        print(
            json.dumps(
                {
                    "suites": {k: v["n"] for k, v in result["suites"].items()},
                    "status": result["suiteStatus"],
                }
            )
        )
    elif args.command == "translate":
        from .translate import prepare_translations

        print(json.dumps(prepare_translations(args.out, args.proxy_budget)))
    elif args.command == "run":
        result = run_system(args)
        print(json.dumps({k: v["status"] for k, v in result.items()}))
    elif args.command == "aggregate":
        result = aggregate(args)
        print(
            json.dumps(
                {
                    "sets": {s: list(v) for s, v in result["sets"].items()},
                    "status": result["status"],
                }
            )
        )
    else:
        from .export import export

        print(json.dumps(export(args.out / "benchmark.json", args.review)))


if __name__ == "__main__":
    main()
