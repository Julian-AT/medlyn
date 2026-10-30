"""Patient split invariants and deterministic proportional stratified sampling."""

import hashlib
from collections import defaultdict

SPLITS = ("train", "validation", "test")


def split_name(value):
    name = "validation" if value in {"val", "valid", "validation"} else value
    if name not in SPLITS:
        raise ValueError("Unknown patient split")
    return name


class SplitGuard:
    def __init__(self):
        self.patients = {}
        self.families = {}

    def add(self, patient, family, split, unique=False):
        if not patient.startswith("synth-") or not family:
            raise ValueError(
                "Only identified synthetic patients with generation families may export"
            )
        split = split_name(split)
        previous = self.patients.get(patient)
        if previous and (previous != split or unique):
            raise ValueError("Patient overlaps splits or is duplicated")
        if family in self.families and self.families[family] != split:
            raise ValueError("Generation family overlaps splits")
        self.patients[patient] = split
        self.families[family] = split


def stratified_subset(index, size, seed=37):
    if size < 1 or size > len(index):
        raise ValueError("Subset size must be positive and no greater than the full dataset")
    groups = defaultdict(list)
    guard = SplitGuard()
    for row in index:
        patient, family, split = row["patientId"], row["family"], split_name(row["split"])
        guard.add(patient, family, split, unique=True)
        groups[(split, family)].append(patient)
    total = len(index)
    quotas = {key: size * len(rows) // total for key, rows in groups.items()}
    remaining = size - sum(quotas.values())
    ranked = sorted(groups, key=lambda key: (-(size * len(groups[key]) % total), key))
    for key in ranked[:remaining]:
        quotas[key] += 1
    selected = set()
    for key, rows in sorted(groups.items()):
        rows.sort(key=lambda patient: hashlib.sha256(f"{seed}:{patient}".encode()).digest())
        selected.update(rows[: quotas[key]])
    return selected
