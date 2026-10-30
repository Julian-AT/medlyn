"""Research metrics with patient-cluster bootstrap and explicit missing-confidence coverage."""

import math
import random
from collections import defaultdict

from .common import LABELS


def confusion(rows):
    return {
        label: {
            prediction: sum(
                row["label"] == label and row["prediction"] == prediction for row in rows
            )
            for prediction in (*LABELS, "unavailable")
        }
        for label in LABELS
    }


def f1_from_confusion(matrix):
    scores = []
    for label in LABELS:
        tp = matrix[label][label]
        actual = sum(matrix[label].values())
        predicted = sum(matrix[other][label] for other in LABELS)
        scores.append(2 * tp / (actual + predicted) if actual + predicted else 0)
    return sum(scores) / len(LABELS)


def bootstrap(rows, iterations=1000, seed=37):
    groups = defaultdict(list)
    for index, row in enumerate(rows):
        groups[row.get("patientId") or row.get("inputHash") or str(index)].append(row)
    if iterations < 1:
        raise ValueError("Bootstrap iterations must be positive")
    single_patient = len(groups) == 1 and all(row.get("patientId") for row in rows)
    if single_patient:
        groups = {str(index): [row] for index, row in enumerate(rows)}
    matrices = [confusion(group) for group in groups.values()]
    if not matrices:
        return {"low": None, "high": None, "replicates": iterations, "unit": "patient"}
    rng = random.Random(seed)
    values = []
    for _ in range(iterations):
        total = {label: dict.fromkeys((*LABELS, "unavailable"), 0) for label in LABELS}
        for _ in matrices:
            matrix = rng.choice(matrices)
            for label in LABELS:
                for predicted in total[label]:
                    total[label][predicted] += matrix[label][predicted]
        values.append(f1_from_confusion(total))
    values.sort()
    return {
        "low": values[int(0.025 * (iterations - 1))],
        "high": values[int(0.975 * (iterations - 1))],
        "replicates": iterations,
        "unit": "claim_within_single_patient"
        if single_patient
        else "patient"
        if all(row.get("patientId") for row in rows)
        else "claim",
        "conditionalOnSinglePatient": single_patient,
    }


def calibration(rows, bins=10):
    eligible = [
        row
        for row in rows
        if row["prediction"] in LABELS
        and isinstance(row.get("probability"), (float, int))
        and math.isfinite(row["probability"])
        and 0 <= row["probability"] <= 1
    ]
    reliability = []
    for index in range(bins):
        values = [row for row in eligible if min(bins - 1, int(row["probability"] * bins)) == index]
        confidence = sum(row["probability"] for row in values) / len(values) if values else None
        accuracy = (
            sum(row["label"] == row["prediction"] for row in values) / len(values)
            if values
            else None
        )
        reliability.append(
            {
                "lower": index / bins,
                "upper": (index + 1) / bins,
                "count": len(values),
                "confidence": confidence,
                "accuracy": accuracy,
            }
        )
    ece = (
        sum(
            item["count"] * abs(item["confidence"] - item["accuracy"])
            for item in reliability
            if item["count"]
        )
        / len(eligible)
        if eligible
        else None
    )
    return {
        "ece": ece,
        "coverage": len(eligible) / len(rows) if rows else 0,
        "n": len(eligible),
        "reliability": reliability,
    }


def scaled(probabilities, temperature):
    if temperature <= 0 or not math.isfinite(temperature):
        raise ValueError("Temperature must be finite and positive")
    logits = {key: math.log(max(1e-12, probabilities[key])) / temperature for key in LABELS}
    highest = max(logits.values())
    weights = {key: math.exp(value - highest) for key, value in logits.items()}
    return {key: value / sum(weights.values()) for key, value in weights.items()}


def fit_temperature(rows):
    eligible = [row for row in rows if row.get("probabilities") and row["prediction"] in LABELS]
    if not eligible:
        raise ValueError("Validation probabilities are required for calibration")
    grid = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0]
    return min(
        grid,
        key=lambda temp: sum(
            -math.log(max(1e-12, scaled(row["probabilities"], temp)[row["label"]]))
            for row in eligible
        ),
    )


def apply_temperature(rows, temperature):
    result = []
    for row in rows:
        if row.get("probabilities") and row["prediction"] in LABELS:
            probabilities = scaled(row["probabilities"], temperature)
            result.append(
                {
                    **row,
                    "probabilities": probabilities,
                    "probability": probabilities[row["prediction"]],
                }
            )
        else:
            result.append(row.copy())
    return result


def choose_threshold(rows, max_error=0.02, minimum=20):
    candidates = sorted(
        {
            row["probability"]
            for row in rows
            if row["prediction"] in LABELS and row.get("probability") is not None
        }
    )
    for threshold in candidates:
        accepted = [
            row
            for row in rows
            if row["prediction"] in LABELS
            and row.get("probability", 0) is not None
            and row["probability"] >= threshold
        ]
        errors = sum(row["prediction"] != row["label"] for row in accepted)
        if len(accepted) >= minimum and errors / len(accepted) <= max_error:
            return {
                "enabled": True,
                "threshold": threshold,
                "accepted": len(accepted),
                "errors": errors,
                "n": len(rows),
                "selectionSplit": "valid",
                "maxError": max_error,
                "minimumAccepted": minimum,
            }
    return {
        "enabled": False,
        "threshold": 1.0,
        "accepted": 0,
        "errors": 0,
        "n": len(rows),
        "selectionSplit": "valid",
        "maxError": max_error,
        "minimumAccepted": minimum,
    }


def cascade_predictions(local, proxy, policy):
    if len(local) != len(proxy) or any(
        a["inputHash"] != b["inputHash"] for a, b in zip(local, proxy)
    ):
        raise ValueError("Cascade predictions must have identical ordered inputs")
    result, saved = [], 0
    for first, second in zip(local, proxy):
        accept = (
            policy["enabled"]
            and first["prediction"] in LABELS
            and first.get("probability") is not None
            and first["probability"] >= policy["threshold"]
        )
        saved += accept
        result.append(
            {
                **(first if accept else second),
                "latencyMs": first["latencyMs"] + (0 if accept else second["latencyMs"]),
                "route": "local" if accept else "gpt",
            }
        )
    return result, {
        "gptCallsSaved": saved,
        "gptCallsRequired": len(local) - saved,
        "shareSaved": saved / len(local) if local else 0,
    }
