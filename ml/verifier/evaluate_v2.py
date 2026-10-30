"""Evaluate frozen suites with validation-only calibration and a reproducible cascade policy."""

import argparse
import concurrent.futures
import json
from collections import defaultdict
from pathlib import Path

from .artifacts import model_identity
from .common import LABELS, VERIFIER_DIR, Bridge, read_jsonl, write_jsonl
from .evaluate import input_hash, judge_identity, load_env, measured, metrics, proxy, subset
from .integrity import file_hash, verify_frozen
from .model import BASE
from .statistics import (
    apply_temperature,
    bootstrap,
    calibration,
    cascade_predictions,
    choose_threshold,
    confusion,
    fit_temperature,
)


def summary(rows, replicates=1000):
    mutations = defaultdict(list)
    for row in rows:
        mutations[row["mutation"]].append(row)
    return {
        **metrics(rows),
        "macroF1CI95": bootstrap(rows, replicates),
        "confusion": confusion(rows),
        "perMutation": {
            key: {**metrics(values), "confusion": confusion(values)}
            for key, values in mutations.items()
        },
        "calibration": calibration(rows),
    }


def costs(rows, input_rate=None, output_rate=None):
    known = [row for row in rows if isinstance(row.get("usage"), dict)]
    prompt = sum(row["usage"].get("prompt_tokens", 0) for row in known)
    completion = sum(row["usage"].get("completion_tokens", 0) for row in known)
    usd = (
        (prompt * input_rate + completion * output_rate) / 1_000_000
        if input_rate is not None and output_rate is not None and len(known) == len(rows)
        else None
    )
    return {
        "requests": len(rows),
        "cacheHits": sum(row.get("cacheHit", False) for row in rows),
        "usageCoverage": len(known) / len(rows) if rows else 0,
        "inputTokens": prompt,
        "outputTokens": completion,
        "usd": usd,
        "inputUsdPerMillion": input_rate,
        "outputUsdPerMillion": output_rate,
        "note": "Unknown tariffs or cached usage remain null; local energy cost is unmeasured",
    }


def export_errors(rows, predictions, path):
    source = {input_hash(row): row for row in rows}
    failures = [row for row in predictions if row["prediction"] != row["label"]]
    failures.sort(key=lambda row: (row["mutation"], row["inputHash"]))
    write_jsonl(
        path,
        (
            {
                **source[row["inputHash"]],
                **row,
                "analysis": {
                    "errorType": "service_unavailable"
                    if row["prediction"] not in LABELS
                    else f"{row['label']}_as_{row['prediction']}",
                    "mutationFamily": row["mutation"],
                    "reviewStatus": "pending human annotation",
                },
            }
            for row in failures[:30]
        ),
    )
    return {"exported": min(30, len(failures)), "reviewStatus": "pending human annotation"}


def cached_proxy(rows, path, budget, cache_sources=()):
    cache = {}
    for candidate in (*cache_sources, path):
        if candidate.exists():
            cache.update(
                {
                    row["inputHash"]: row
                    for row in read_jsonl(candidate)
                    if row.get("judgeIdentity") == judge_identity()
                    and row.get("prediction") in LABELS
                }
            )
    missing = [row for row in rows if input_hash(row) not in cache]
    if len(missing) > budget:
        raise ValueError(
            f"Proxy budget needs {len(missing)} calls; increase --proxy-budget explicitly"
        )
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        fresh = list(pool.map(lambda row: measured(row, proxy), missing))
    for row in fresh:
        cache[row["inputHash"]] = {**row, "judgeIdentity": judge_identity()}
    path.parent.mkdir(parents=True, exist_ok=True)
    write_jsonl(path, cache.values())
    new_hashes = {row["inputHash"] for row in fresh}
    return [
        {
            **cache[input_hash(row)],
            "label": row["label"],
            "mutation": row["mutation"],
            "patientId": row.get("patientId"),
            "cacheHit": input_hash(row) not in new_hashes,
        }
        for row in rows
    ]


def evaluate(args):
    if args.limit < 3 or args.bootstrap < 20 or args.proxy_budget < 0:
        raise ValueError("Need limit >=3, bootstrap >=20, and nonnegative proxy budget")
    if args.dry_run and (args.local or args.proxy):
        raise ValueError("Dry runs skip MLX and proxy; omit --local/--proxy")
    load_env()
    frozen = verify_frozen(args.data)
    model, adapters = args.model, args.adapters
    if args.selection:
        selected = json.loads(args.selection.read_text())
        winner = selected.get("winner")
        if selected.get("selectionSplit") != "valid" or not winner:
            raise ValueError("Sweep must select a completed validation run")
        if winner["validSha256"] != file_hash(args.data / "valid.examples.jsonl"):
            raise ValueError("Sweep validation data changed")
        model, adapters = winner["model"], args.selection.parent / winner["id"] / "adapters"
    out = args.out or (
        args.data / "dry-results.json" if args.dry_run else VERIFIER_DIR / "results.json"
    )
    # Text-bearing prediction/error artifacts always remain within an ignored run directory.
    artifact_dir = args.data / "evaluation" / args.split
    artifact_dir.mkdir(parents=True, exist_ok=True)
    local = None
    identity = None
    if args.local:
        from .model import Verifier

        local = Verifier(model, adapters)
        identity = model_identity(model, adapters)
    policy = None
    if local:
        valid = subset(list(read_jsonl(args.data / "valid.examples.jsonl")), args.limit)
        validation = [
            measured(row, lambda item: local.verify(item["claim"], item["passages"]))
            for row in valid
        ]
        if any(row["prediction"] not in LABELS for row in validation):
            raise ValueError("Validation inference incomplete; no calibration or selection allowed")
        temperature = fit_temperature(validation)
        calibrated = apply_temperature(validation, temperature)
        policy = {
            **choose_threshold(calibrated),
            "temperature": temperature,
            "verifierIdentity": identity,
            "validationSha256": file_hash(args.data / "valid.examples.jsonl"),
            "validationInputHashes": [row["inputHash"] for row in validation],
            "probabilityKind": "temperature_scaled_closed_set_score",
            "selectionSplit": "valid",
            "schemaVersion": 1,
        }
        write_jsonl(artifact_dir / "validation-local.jsonl", calibrated)
        (args.data / "cascade-policy.json").write_text(json.dumps(policy, indent=2) + "\n")
    suites = {
        args.split: subset(list(read_jsonl(args.data / f"{args.split}.examples.jsonl")), args.limit)
    }
    if args.split == "test":
        for name in ("rewritten", "real-gold"):
            path = args.data / f"{name}.examples.jsonl" if name == "rewritten" else args.real
            if path and path.exists():
                suites[name] = subset(list(read_jsonl(path)), args.limit)
    report = {
        "version": 2,
        "status": "dry_run" if args.dry_run else "measured",
        "sets": {},
        "evaluationIdentity": {
            "frozenTests": frozen,
            "selectionSplit": "valid",
            "verifierIdentity": identity,
            "judgeIdentity": judge_identity(),
            "seed": 37,
            "evaluatedSplit": args.split,
            "evaluatedSources": {
                name: file_hash(args.data / f"{name}.examples.jsonl") for name in ("train", "valid")
            },
        },
        "cascadePolicy": policy,
        "cascadeEvaluationMode": "offline_replay_both_predictions_collected",
        "cost": {},
        "limitations": [
            "Rule labels are not human gold",
            "Real-text set is test-only and never calibration data",
            "Closed-set temperature scaling is fit on validation only",
            "Bootstrap uses patient clusters where identifiers are present",
            "No measured real-regression result is implied",
        ],
    }
    report["evaluationIdentity"]["suiteInputHashes"] = {
        name: [input_hash(row) for row in rows] for name, rows in suites.items()
    }
    budget = args.proxy_budget
    with Bridge() as bridge:
        for name, rows in suites.items():
            evaluated = {
                "rules_only": [
                    measured(
                        row,
                        lambda item: {
                            "label": "supported"
                            if bridge.call(
                                op="rules",
                                claim=item["claim"],
                                sources=[
                                    json.dumps(p, ensure_ascii=False) for p in item["passages"]
                                ],
                            )["ok"]
                            else "unsupported"
                        },
                    )
                    for row in rows
                ]
            }
            if local:
                raw = [
                    measured(row, lambda item: local.verify(item["claim"], item["passages"]))
                    for row in rows
                ]
                evaluated["local_qlora_raw"] = raw
                evaluated["local_qlora"] = apply_temperature(raw, policy["temperature"])
            if args.proxy and rows:
                values = cached_proxy(
                    rows,
                    args.data / "proxy-cache.jsonl",
                    budget,
                    (VERIFIER_DIR / "datasets/proxy-cache.jsonl",),
                )
                budget -= sum(not row["cacheHit"] for row in values)
                evaluated["proxy_fast"] = values
                report["cost"][name] = costs(
                    values, args.input_usd_per_million, args.output_usd_per_million
                )
                if local:
                    cascade, savings = cascade_predictions(evaluated["local_qlora"], values, policy)
                    evaluated["cascade"] = cascade
                    report.setdefault("cascade", {})[name] = {
                        **savings,
                        "accuracyDeltaVsGpt": sum(a["label"] == a["prediction"] for a in cascade)
                        / len(cascade)
                        - sum(a["label"] == a["prediction"] for a in values) / len(values),
                    }
            report["sets"][name] = {
                method: summary(values, args.bootstrap) for method, values in evaluated.items()
            }
            report.setdefault("errorAnalysis", {})[name] = {}
            for method, values in evaluated.items():
                write_jsonl(artifact_dir / f"predictions-{name}-{method}.jsonl", values)
                report["errorAnalysis"][name][method] = export_errors(
                    rows, values, artifact_dir / f"errors-{name}-{method}.jsonl"
                )
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n")
    from .report import write_markdown

    write_markdown(
        report,
        VERIFIER_DIR / "RESULTS.md"
        if out == VERIFIER_DIR / "results.json"
        else out.with_suffix(".md"),
    )
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", choices=("2",), default="2")
    parser.add_argument("--data", type=Path, default=VERIFIER_DIR / "runs/data-v2")
    parser.add_argument("--split", choices=("valid", "test"), default="test")
    parser.add_argument("--limit", type=int, default=300)
    parser.add_argument("--bootstrap", type=int, default=1000)
    parser.add_argument("--proxy-budget", type=int, default=300)
    parser.add_argument("--local", action="store_true")
    parser.add_argument("--proxy", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--model", default=BASE)
    parser.add_argument("--adapters", type=Path, default=VERIFIER_DIR / "adapters")
    parser.add_argument("--selection", type=Path)
    parser.add_argument("--real", type=Path)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--input-usd-per-million", type=float)
    parser.add_argument("--output-usd-per-million", type=float)
    args = parser.parse_args()
    report = evaluate(args)
    print(
        json.dumps(
            {
                "status": report["status"],
                "sets": {
                    name: {method: values["n"] for method, values in methods.items()}
                    for name, methods in report["sets"].items()
                },
            }
        )
    )


if __name__ == "__main__":
    main()
