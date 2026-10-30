"""Fixed-label scores; abstentions remain errors in both label spaces."""

import math
import statistics

import numpy as np

from verifier.common import LABELS


def matrix(rows, binary=False):
    labels = ("supported", "not_supported") if binary else LABELS
    result = np.zeros((len(labels), len(labels) + 1), dtype=int)
    for row in rows:
        actual, predicted = row["label"], row["prediction"]
        if binary:
            actual = "supported" if actual == "supported" else "not_supported"
            if predicted in (*LABELS, "not_supported"):
                predicted = "supported" if predicted == "supported" else "not_supported"
        result[labels.index(actual), labels.index(predicted) if predicted in labels else -1] += 1
    return result


def scores(counts):
    actual = counts.sum(axis=-1)
    predicted = counts[..., :-1].sum(axis=-2)
    tp = np.diagonal(counts[..., :-1], axis1=-2, axis2=-1)
    f1 = np.divide(
        2 * tp,
        actual + predicted,
        out=np.zeros_like(tp, dtype=float),
        where=(actual + predicted) > 0,
    )
    recall = np.divide(tp, actual, out=np.zeros_like(tp, dtype=float), where=actual > 0)
    nclasses = (actual > 0).sum(axis=-1)
    balanced = np.divide(
        recall.sum(axis=-1), nclasses, out=np.zeros_like(nclasses, dtype=float), where=nclasses > 0
    )
    return f1.mean(axis=-1), f1[..., 0], balanced


def calibration(rows, binary=False, bins=10):
    eligible = []
    for row in rows:
        probs = row.get("probabilities")
        if not probs or row["prediction"] not in (*LABELS, "not_supported"):
            continue
        values = list(probs.values())
        if any(
            not isinstance(v, (int, float)) or not math.isfinite(v) or not 0 <= v <= 1
            for v in values
        ):
            raise ValueError("Invalid probability vector")
        if not math.isclose(sum(values), 1, abs_tol=1e-6):
            raise ValueError("Probability vector must sum to one")
        if binary:
            p = probs["supported"]
            confidence = p if row["prediction"] == "supported" else 1 - p
            correct = (row["prediction"] == "supported") == (row["label"] == "supported")
        else:
            confidence = probs[row["prediction"]]
            correct = row["prediction"] == row["label"]
        eligible.append((confidence, correct))
    records = []
    for i in range(bins):
        group = [(p, ok) for p, ok in eligible if min(bins - 1, int(p * bins)) == i]
        records.append(
            {
                "lower": i / bins,
                "upper": (i + 1) / bins,
                "n": len(group),
                "confidence": statistics.mean(p for p, _ in group) if group else None,
                "accuracy": statistics.mean(ok for _, ok in group) if group else None,
            }
        )
    ece = (
        sum(b["n"] * abs(b["confidence"] - b["accuracy"]) for b in records if b["n"])
        / len(eligible)
        if eligible
        else None
    )
    return {
        "ece": ece,
        "n": len(eligible),
        "coverage": len(eligible) / len(rows) if rows else 0,
        "bins": records,
    }


def summarize(rows, binary_only=False):
    n = len(rows)
    binary = matrix(rows, True)
    _, f1, balanced = scores(binary)
    classes = {}
    if not binary_only:
        counts = matrix(rows)
        for i, label in enumerate(LABELS):
            tp = int(counts[i, i])
            actual, predicted = int(counts[i].sum()), int(counts[:, i].sum())
            classes[label] = {
                "precision": tp / predicted if predicted else 0,
                "recall": tp / actual if actual else 0,
                "f1": 2 * tp / (actual + predicted) if actual + predicted else 0,
                "support": actual,
            }
    binary_classes = {}
    for i, label in enumerate(("supported", "not_supported")):
        tp = int(binary[i, i])
        actual, predicted = int(binary[i].sum()), int(binary[:, i].sum())
        binary_classes[label] = {
            "precision": tp / predicted if predicted else 0,
            "recall": tp / actual if actual else 0,
            "f1": 2 * tp / (actual + predicted) if actual + predicted else 0,
            "support": actual,
        }
    latencies = sorted(
        r["latencyMs"]
        for r in rows
        if r.get("latencyMs") is not None and r["prediction"] != "unavailable"
    )
    return {
        "n": n,
        "macroF1": float(scores(matrix(rows))[0]) if n and not binary_only else None,
        "binaryF1": float(f1) if n and binary[0].sum() else None,
        "balancedAccuracy": float(balanced) if n and all(binary.sum(axis=1)) else None,
        "classes": classes,
        "metricStatus": {
            "binaryF1": "defined" if n and binary[0].sum() else "undefined_no_supported_references",
            "balancedAccuracy": "defined"
            if n and all(binary.sum(axis=1))
            else "undefined_single_binary_class",
            "macroF1": "not_applicable_binary_system_or_dataset"
            if binary_only
            else "fixed_three_class_mean_zero_division_zero",
        },
        "coverage": sum(r["prediction"] != "unavailable" for r in rows) / n if n else 0,
        "unavailable": sum(r["prediction"] == "unavailable" for r in rows),
        "binaryConfusion": binary.tolist(),
        "binaryClasses": binary_classes,
        "confusion": matrix(rows).tolist() if not binary_only else None,
        "calibration": calibration(rows, binary_only),
        "binaryCalibration": calibration(rows, True),
        "latencyMs": {
            "n": len(latencies),
            "p50": statistics.median(latencies) if latencies else None,
            "p95": float(np.quantile(latencies, 0.95)) if latencies else None,
            "mean": statistics.mean(latencies) if latencies else None,
        },
    }
