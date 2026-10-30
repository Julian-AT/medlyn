"""Patient/document cluster bootstrap and strictly paired comparisons."""

from collections import defaultdict

import numpy as np

from .metrics import matrix, scores


def clusters(rows):
    keys = [r.get("patientId") or r.get("documentHash") or r["inputHash"] for r in rows]
    single = len(set(keys)) == 1 and bool(rows)
    if single:
        keys = [r["inputHash"] for r in rows]
    groups = defaultdict(list)
    for key, row in zip(keys, rows):
        groups[key].append(row)
    unit = "claim_conditional_on_single_patient" if single else "patient_or_document"
    return list(groups.values()), unit


def draws(rows, replicates=1000, seed=37):
    if replicates < 1 or not rows:
        raise ValueError("Bootstrap needs rows and positive replicates")
    groups, unit = clusters(rows)
    indices = np.random.default_rng(seed).integers(0, len(groups), size=(replicates, len(groups)))
    return groups, indices, unit


def intervals(rows, binary_only=False, replicates=1000, seed=37):
    groups, indices, unit = draws(rows, replicates, seed)
    result = {"replicates": replicates, "seed": seed, "unit": unit}
    for binary, names in (
        (False, ("macroF1",)),
        (True, ("binaryMacroF1", "binaryF1", "balancedAccuracy")),
    ):
        if not binary and binary_only:
            continue
        matrices = np.array([matrix(g, binary) for g in groups])
        values = scores(matrices[indices].sum(axis=1))
        for name, values_for_metric in zip(names, values):
            original = matrix(rows, True)
            if name == "binaryF1" and not original[0].sum():
                continue
            if name == "balancedAccuracy" and not all(original.sum(axis=1)):
                continue
            result[name] = [float(x) for x in np.quantile(values_for_metric, [0.025, 0.975])]
    return result


def paired(left, right, binary_only=False, replicates=1000, seed=37):
    a, b = ({r["inputHash"]: r for r in rows} for rows in (left, right))
    if len(a) != len(left) or len(b) != len(right) or a.keys() != b.keys():
        raise ValueError("Paired inputs must match exactly without duplicates")
    if any(a[key]["label"] != b[key]["label"] for key in a):
        raise ValueError("Paired reference labels differ")
    ordered = list(a.values())
    groups, indices, unit = draws(ordered, replicates, seed)
    result = {"n": len(left), "unit": unit, "replicates": replicates, "seed": seed, "tests": {}}
    for binary, metric, index in (
        (False, "macroF1", 0),
        (True, "binaryF1", 1),
        (True, "balancedAccuracy", 2),
    ):
        if binary_only and not binary:
            continue
        original = matrix(ordered, True)
        if metric == "binaryF1" and not original[0].sum():
            continue
        if metric == "balancedAccuracy" and not all(original.sum(axis=1)):
            continue
        ma = np.array([matrix(g, binary) for g in groups])
        mb = np.array([matrix([b[r["inputHash"]] for r in g], binary) for g in groups])
        delta = float(scores(ma.sum(axis=0))[index] - scores(mb.sum(axis=0))[index])
        samples = scores(ma[indices].sum(axis=1))[index] - scores(mb[indices].sum(axis=1))[index]
        p = (1 + int((np.abs(samples - delta) >= abs(delta)).sum())) / (replicates + 1)
        result["tests"][metric] = {
            "deltaLeftMinusRight": delta,
            "ci95": [float(v) for v in np.quantile(samples, [0.025, 0.975])],
            "pTwoSidedCenteredBootstrap": p,
        }
    return result
