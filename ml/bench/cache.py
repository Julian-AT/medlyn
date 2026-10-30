"""Exact input and system identity cache, with legacy GPT cache import."""

import concurrent.futures
import time

from verifier.common import LABELS
from verifier.evaluate import input_hash, judge_identity

from .io import input_identity, read, text_jsonl


def legacy_proxy(paths):
    values = {}
    for path in paths:
        if path.exists():
            for row in read(path):
                if row.get("judgeIdentity") == judge_identity() and row.get("prediction") in LABELS:
                    values[row["inputHash"]] = row
    return values


def measure(row, predict, identity):
    started = time.perf_counter()
    try:
        prediction = predict(row)
        if prediction["label"] not in (*LABELS, "not_supported"):
            raise ValueError("Unknown prediction label")
        value = {
            "prediction": prediction["label"],
            "probabilities": prediction.get("probabilities"),
            "usage": prediction.get("usage"),
            "error": None,
        }
    except (OSError, RuntimeError, ValueError, KeyError, TypeError) as error:
        value = {"prediction": "unavailable", "error": type(error).__name__}
    return {
        **value,
        "latencyMs": (time.perf_counter() - started) * 1000,
        "inputHash": input_identity(row),
        "systemIdentity": identity,
    }


def evaluate(rows, predict, identity, path, legacy=None, budget=None, workers=1):
    existing = read(path) if path.exists() else []
    cache = {
        r["inputHash"]: r
        for r in existing
        if r.get("systemIdentity") == identity and r.get("prediction") in (*LABELS, "not_supported")
    }
    legacy = legacy or {}
    missing = {
        input_identity(r): r
        for r in rows
        if input_identity(r) not in cache and input_hash(r) not in legacy
    }
    if budget is not None and len(missing) > budget:
        raise ValueError(f"Proxy requires {len(missing)} uncached calls; budget is {budget}")
    fresh = set(missing)
    if workers > 1:
        with concurrent.futures.ThreadPoolExecutor(max_workers=min(3, workers)) as pool:
            futures = [pool.submit(measure, row, predict, identity) for row in missing.values()]
            for future in concurrent.futures.as_completed(futures):
                value = future.result()
                row = missing[value["inputHash"]]
                cache[value["inputHash"]] = {**value, "label": row["label"], "cacheHit": False}
                text_jsonl(path, cache.values())
    result = []
    for row in rows:
        key = input_identity(row)
        value = cache.get(key) or legacy.get(input_hash(row))
        if value is None:
            value = measure(row, predict, identity)
        value = {
            **value,
            "inputHash": key,
            "systemIdentity": identity,
            "cacheHit": key not in fresh,
            "label": row["label"],
            "patientId": row.get("patientId"),
            "documentHash": row.get("documentHash"),
            "family": row.get("family"),
            "mutation": row.get("mutation"),
        }
        # Preserve execution timing on cache hits; never time a cache lookup as inference.
        result.append(value)
        cache[key] = value
        text_jsonl(path, cache.values())
    return result
