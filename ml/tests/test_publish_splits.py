from collections import Counter

import pytest

from publish.splits import SplitGuard, split_name, stratified_subset


def test_subset_is_stratified_exact_nested_and_order_independent():
    rows = [
        {
            "patientId": f"synth-{index:06d}",
            "family": f"family-{index % 10}",
            "split": "test" if index % 10 == 9 else "val" if index % 10 == 8 else "train",
        }
        for index in range(1000)
    ]
    selected = stratified_subset(rows, 100)
    assert len(selected) == 100
    assert selected == stratified_subset(list(reversed(rows)), 100)
    assert Counter(split_name(row["split"]) for row in rows if row["patientId"] in selected) == {
        "train": 80,
        "validation": 10,
        "test": 10,
    }
    assert Counter(row["family"] for row in rows if row["patientId"] in selected) == {
        f"family-{i}": 10 for i in range(10)
    }


def test_split_guard_rejects_patient_and_family_leakage():
    guard = SplitGuard()
    guard.add("synth-000001", "family-a", "train")
    guard.add("synth-000001", "family-a", "train")
    with pytest.raises(ValueError, match="Patient overlaps"):
        guard.add("synth-000001", "family-a", "test")
    with pytest.raises(ValueError, match="family overlaps"):
        guard.add("synth-000002", "family-a", "validation")
    with pytest.raises(ValueError, match="synthetic"):
        guard.add("patient-0000-0001", "family-b", "test")


def test_split_aliases_and_invalid_subset():
    assert split_name("valid") == split_name("val") == "validation"
    with pytest.raises(ValueError, match="Unknown"):
        split_name("real")
    with pytest.raises(ValueError, match="Subset size"):
        stratified_subset([], 1)
