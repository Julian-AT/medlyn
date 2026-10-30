"""Compare local QLoRA, the exact engine code check and the proxy on frozen test rows."""

import argparse
import concurrent.futures
import hashlib
import json
import os
import random
import statistics
import time
import urllib.request
from pathlib import Path

from .common import (
    ASSERTIONS,
    LABELS,
    ROOT,
    SYSTEM,
    TIMINGS,
    VERIFIER_DIR,
    Bridge,
    messages,
    read_jsonl,
    write_jsonl,
)


def metrics(rows):
    classes = {}
    for label in LABELS:
        tp = sum(row["label"] == label and row["prediction"] == label for row in rows)
        predicted = sum(row["prediction"] == label for row in rows)
        actual = sum(row["label"] == label for row in rows)
        precision = tp / predicted if predicted else 0
        recall = tp / actual if actual else 0
        classes[label] = {
            "precision": precision,
            "recall": recall,
            "f1": 2 * precision * recall / (precision + recall) if precision + recall else 0,
            "support": actual,
        }
    latencies = sorted(row["latencyMs"] for row in rows)
    return {
        "n": len(rows),
        "macroF1": sum(item["f1"] for item in classes.values()) / 3,
        "classes": classes,
        "coverage": sum(r["prediction"] in LABELS for r in rows) / len(rows) if rows else 0,
        "errors": sum(r["prediction"] not in LABELS for r in rows),
        "latencyMs": {
            "mean": statistics.mean(latencies) if latencies else None,
            "p50": statistics.median(latencies) if latencies else None,
            "p95": latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))]
            if latencies
            else None,
        },
    }


def load_env():
    # Read root dotenv without exposing its values in command arguments or logs.
    if not (ROOT / ".env").exists():
        return
    for line in (ROOT / ".env").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.removeprefix("export ").split("=", 1)
        value = value.strip()
        if value[:1] in ("'", '"') and value[-1:] == value[:1]:
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)


def proxy(row):
    model = os.environ.get("MODEL_FAST")
    if not model:
        raise ValueError("MODEL_FAST is missing")
    schema = {
        "type": "object",
        "properties": {
            "label": {"type": "string", "enum": list(LABELS)},
            "assertion": {"type": "string", "enum": list(ASSERTIONS)},
            "timing": {"type": "string", "enum": list(TIMINGS)},
        },
        "required": ["label", "assertion", "timing"],
        "additionalProperties": False,
    }
    payload = {
        "model": model,
        "messages": messages(row["claim"], row["passages"]),
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "verifier_eval", "strict": True, "schema": schema},
        },
    }
    request = urllib.request.Request(
        os.environ.get("OPENAI_BASE_URL", "http://localhost:8317/v1").rstrip("/")
        + "/chat/completions",
        data=json.dumps(payload).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + os.environ.get("OPENAI_API_KEY", ""),
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    result = json.loads(body["choices"][0]["message"]["content"])
    if result["label"] not in LABELS:
        raise ValueError("Invalid proxy label")
    return {**result, "usage": body.get("usage")}


def export_real(bridge, out):
    corpus = bridge.call(op="real")
    segments = {}
    for document in corpus["documents"]:
        for index, segment in enumerate(document["segments"]):
            segments[segment["id"]] = {
                **segment,
                "documentDate": document["date"],
                "before": [seg["text"] for seg in document["segments"][max(0, index - 1) : index]],
                "after": [seg["text"] for seg in document["segments"][index + 1 : index + 2]],
            }
    validations = {item["cacheKey"]: item for item in corpus["validations"]}
    rows, seen = [], set()
    for letter in corpus["letters"]:
        stored = letter["claims"]
        claims = (
            [claim for section in stored.get("sections", []) for claim in section["claims"]]
            if isinstance(stored, dict)
            else stored
        )
        for claim in claims:
            if claim.get("author") != "machine" or claim.get("kind") not in (
                "composed",
                "template",
            ):
                continue
            cached = validations.get(claim.get("validation", {}).get("key"))
            if not cached or cached["verdict"] not in ("supported", "unsupported"):
                continue
            ids = claim.get("segmentIds", [])
            if not ids or any(seg not in segments for seg in ids) or claim["text"] in seen:
                continue
            seen.add(claim["text"])
            rows.append(
                {
                    "patientId": corpus["patientId"],
                    "family": "real_patient_test_only",
                    "claim": claim["text"],
                    "label": cached["verdict"],
                    "labelTier": "engine_cached_weak_label_not_gold",
                    "mutation": "none",
                    "passages": [
                        {
                            key: segments[seg].get(key)
                            for key in ("text", "section", "documentDate", "before", "after")
                        }
                        for seg in ids
                    ],
                }
            )
    write_jsonl(out, rows)
    return rows


def measured(row, predict):
    started = time.perf_counter()
    error_status = None
    try:
        result = predict(row)
        prediction = result["label"]
        error = None
    except (RuntimeError, ValueError, TypeError, KeyError, OSError) as exc:
        prediction, error, result = "unavailable", type(exc).__name__, {}
        error_status = getattr(exc, "code", None)
    return {
        "inputHash": input_hash(row),
        "label": row["label"],
        "prediction": prediction,
        "error": error,
        "errorStatus": error_status,
        "latencyMs": (time.perf_counter() - started) * 1000,
        "mutation": row["mutation"],
        "probability": result.get("probability"),
        "probabilities": result.get("probabilities"),
        "usage": result.get("usage"),
        "patientId": row.get("patientId"),
        "family": row.get("family"),
    }


def input_hash(row):
    return hashlib.sha256(
        json.dumps([row["claim"], row["passages"]], sort_keys=True).encode()
    ).hexdigest()


def judge_identity():
    return hashlib.sha256((os.environ.get("MODEL_FAST", "") + SYSTEM).encode()).hexdigest()


def subset(rows, limit, seed=37):
    rng = random.Random(seed)
    selected = []
    for label in LABELS:
        group = [row for row in rows if row["label"] == label]
        rng.shuffle(group)
        selected.extend(group[: max(1, limit // 3)])
    selected_ids = {id(row) for row in selected}
    remaining = [row for row in rows if id(row) not in selected_ids]
    rng.shuffle(remaining)
    selected.extend(remaining[: max(0, limit - len(selected))])
    rng.shuffle(selected)
    return selected[:limit]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    selector = argparse.ArgumentParser(add_help=False)
    selector.add_argument("--version", type=int, choices=(1, 2), default=2)
    selected, _ = selector.parse_known_args()
    if selected.version == 2:
        from .evaluate_v2 import main as main_v2

        main_v2()
        return
    parser.add_argument("--version", type=int, choices=(1,), default=1)
    parser.add_argument("--data", type=Path, default=VERIFIER_DIR / "datasets")
    parser.add_argument("--limit", type=int, default=90)
    parser.add_argument("--proxy", action="store_true")
    parser.add_argument("--local", action="store_true")
    parser.add_argument("--real", action="store_true")
    parser.add_argument("--retry-unavailable", action="store_true")
    args = parser.parse_args()
    if not 3 <= args.limit <= 300:
        parser.error("limit must be between 3 and 300")
    load_env()
    if args.retry_unavailable:
        retry_unavailable(args.data)
        return
    test = list(read_jsonl(args.data / "test.examples.jsonl"))
    manifest = json.loads((args.data / "manifest.json").read_text())
    heldout = set(manifest.get("heldOutMutationTypes", ("assertion_flip", "date_typo")))
    sets = {"synthetic_heldout_families": subset(test, args.limit)}
    # This is a separately reported subset of the same test set, not additional proxy calls.
    with Bridge(env=True) as bridge:
        real_status = "not requested"
        if args.real:
            try:
                real = export_real(bridge, args.data / "real.examples.jsonl")
                sets["real_patient_weak_labels"] = subset(real, max(3, args.limit // 3))
                real_status = f"{len(real)} eligible cached letter claims"
            except (RuntimeError, ValueError, TypeError, KeyError, OSError) as error:
                real_status = f"unavailable: {type(error).__name__}"
        verifier = None
        local_status = "not requested"
        if args.local:
            try:
                from .model import Verifier

                verifier = Verifier()
                local_status = "trained adapter"
            except (ImportError, OSError, RuntimeError) as error:
                local_status = f"unavailable: {type(error).__name__}"
                if "No Metal device available" in str(error):
                    local_status += " (No Metal device available)"
        results = {
            "sets": {},
            "realPatientStatus": real_status,
            "localStatus": local_status,
            "evaluationIdentity": {
                "testSha256": hashlib.sha256(
                    (args.data / "test.examples.jsonl").read_bytes()
                ).hexdigest(),
                "heldOutMutationTypes": sorted(heldout),
                "seed": 37,
                "judgeIdentity": judge_identity(),
            },
            "cost": {
                "proxyCalls": 0,
                "proxyConcurrency": 3,
                "currency": None,
                "note": "Proxy tariff unknown; no monetary cost invented",
                "cachedProxyPredictions": 0,
            },
            "limitations": [
                "Synthetic labels are not human gold",
                "Real labels reuse the engine judge",
                "Code-check pass is necessary but does not entail support",
                "Local probabilities are uncalibrated closed-set sequence scores",
                "Macro F1 uses all three labels even in subsets with absent classes; inspect per-class support",
            ],
        }
        proxy_budget = 300
        cache_path = args.data / "proxy-cache.jsonl"
        cache = (
            {
                row["inputHash"]: row
                for row in read_jsonl(cache_path)
                if row["prediction"] in LABELS and row.get("judgeIdentity") == judge_identity()
            }
            if cache_path.exists()
            else {}
        )
        for name, rows in sets.items():
            rows = rows[:proxy_budget] if args.proxy else rows
            rules = [
                measured(
                    row,
                    lambda item: {
                        "label": "supported"
                        if bridge.call(
                            op="rules",
                            claim=item["claim"],
                            sources=[json.dumps(p, ensure_ascii=False) for p in item["passages"]],
                        )["ok"]
                        else "unsupported"
                    },
                )
                for row in rows
            ]
            evaluated = {"rules_only": rules}
            if verifier:
                evaluated["local_qlora"] = [
                    measured(row, lambda item: verifier.verify(item["claim"], item["passages"]))
                    for row in rows
                ]
            if args.proxy and rows:
                missing = [index for index, row in enumerate(rows) if input_hash(row) not in cache]
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                    fresh = list(
                        pool.map(
                            lambda row: measured(row, proxy), [rows[index] for index in missing]
                        )
                    )
                fresh_by_index = dict(zip(missing, fresh))
                evaluated["proxy_fast"] = [
                    fresh_by_index[index]
                    if index in fresh_by_index
                    else {
                        **cache[input_hash(row)],
                        "label": row["label"],
                        "mutation": row["mutation"],
                        "cacheHit": True,
                    }
                    for index, row in enumerate(rows)
                ]
                proxy_budget -= len(missing)
                results["cost"]["proxyCalls"] += len(missing)
                results["cost"]["cachedProxyPredictions"] += len(rows) - len(missing)
                for prediction in evaluated["proxy_fast"]:
                    cache[prediction["inputHash"]] = {
                        **prediction,
                        "judgeIdentity": judge_identity(),
                    }
                write_jsonl(cache_path, cache.values())
            results["sets"][name] = {
                method: metrics(values) for method, values in evaluated.items()
            }
            if name == "synthetic_heldout_families":
                results["sets"]["heldout_mutation_types"] = {
                    method: metrics([value for value in values if value["mutation"] in heldout])
                    for method, values in evaluated.items()
                }
            for method, values in evaluated.items():
                write_jsonl(args.data / f"predictions-{name}-{method}.jsonl", values)
        write_results(results)


def retry_unavailable(data):
    results = json.loads((VERIFIER_DIR / "results.json").read_text())
    actual_hash = hashlib.sha256((data / "test.examples.jsonl").read_bytes()).hexdigest()
    if actual_hash != results["evaluationIdentity"]["testSha256"]:
        raise ValueError("Frozen test changed; cached prediction order cannot be reused")
    if results["evaluationIdentity"].get("judgeIdentity", judge_identity()) != judge_identity():
        raise ValueError("Proxy model or prompt changed; cached predictions cannot be reused")
    heldout = set(results["evaluationIdentity"]["heldOutMutationTypes"])
    budget = 300 - results["cost"]["proxyCalls"]
    for name, source in (
        ("synthetic_heldout_families", "test"),
        ("real_patient_weak_labels", "real"),
    ):
        path = data / f"predictions-{name}-proxy_fast.jsonl"
        if not path.exists():
            continue
        predictions = list(read_jsonl(path))
        rows = subset(list(read_jsonl(data / f"{source}.examples.jsonl")), len(predictions))
        failed = [
            index for index, row in enumerate(predictions) if row["prediction"] == "unavailable"
        ][:budget]
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            retried = list(
                pool.map(lambda row: measured(row, proxy), [rows[index] for index in failed])
            )
        for index, prediction in zip(failed, retried):
            prediction["firstAttemptLatencyMs"] = predictions[index]["latencyMs"]
            prediction["latencyMs"] += predictions[index]["latencyMs"]
            predictions[index] = prediction
        budget -= len(failed)
        results["cost"]["proxyCalls"] += len(failed)
        results["cost"]["retriedUnavailable"] = results["cost"].get("retriedUnavailable", 0) + len(
            failed
        )
        results["sets"][name]["proxy_fast"] = metrics(predictions)
        if name == "synthetic_heldout_families":
            results["sets"]["heldout_mutation_types"]["proxy_fast"] = metrics(
                [row for row in predictions if row["mutation"] in heldout]
            )
        write_jsonl(path, predictions)
    write_results(results)


def write_results(results):
    (VERIFIER_DIR / "results.json").write_text(json.dumps(results, indent=2))
    lines = [
        "# Verifier results",
        "",
        "Machine-measured research results; no human gold claims.",
        "",
        "| Set | Method | n | Macro F1 | Coverage | Mean ms |",
        "|---|---|---:|---:|---:|---:|",
    ]
    for name, methods in results["sets"].items():
        for method, result in methods.items():
            latency = result["latencyMs"]["mean"]
            lines.append(
                f"| {name} | {method} | {result['n']} | {result['macroF1']:.3f} | "
                f"{result['coverage']:.3f} | {latency:.1f} |"
                if latency is not None
                else f"| {name} | {method} | 0 | n/a | n/a | n/a |"
            )
    lines += [
        "",
        f"Real patient: {results['realPatientStatus']}.",
        f"Local model: {results['localStatus']}.",
        "",
        "Per-class precision/recall/F1 and latency percentiles are in results.json.",
        "",
        *[f"- {item}" for item in results["limitations"]],
        "",
        f"Proxy calls: {results['cost']['proxyCalls']}; concurrency ≤3. Monetary cost unavailable.",
        f"Cached proxy predictions reused: {results['cost'].get('cachedProxyPredictions', 0)}; their original request latencies are retained.",
    ]
    (VERIFIER_DIR / "RESULTS.md").write_text("\n".join(lines) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
