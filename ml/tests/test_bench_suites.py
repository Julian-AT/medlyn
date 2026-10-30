import json

import pytest

from bench.io import digest, input_identity
from bench.suites import assert_disjoint, public_rows, stratified, validate


def example(i, label="supported"):
    return {
        "claim": f"Example claim {i}",
        "passages": [{"text": f"Invented source {i}", "before": [], "after": [], "section": None}],
        "label": label,
        "patientId": f"p-{i}",
        "family": f"family-{i}",
        "mutation": "none",
    }


def test_stratification_is_deterministic_without_duplicates():
    values = [example(i, ("supported", "unsupported", "contradicted")[i % 3]) for i in range(30)]
    selected = stratified(values, 9)
    assert selected == stratified(values, 9)
    assert len({input_identity(r) for r in selected}) == 9
    assert {
        label: sum(r["label"] == label for r in selected)
        for label in ("supported", "unsupported", "contradicted")
    } == dict.fromkeys(("supported", "unsupported", "contradicted"), 3)


def test_public_sample_stratifies_source_and_label_and_maps_binary():
    values = [
        {
            "doc": f"Public invented document {i}",
            "claim": f"Public claim {i}",
            "dataset": f"s-{i % 5}",
            "label": i % 2,
        }
        for i in range(600)
    ]
    result = public_rows(values)
    assert len(result) == 500
    assert {r["label"] for r in result} == {"supported", "unsupported"}
    assert all(r["language"] == "en" for r in result)
    assert len({r["documentHash"] for r in result}) == 500
    assert public_rows(values) == result


def test_patient_family_and_prompt_overlap_are_rejected():
    a, b = example(1), example(2)
    assert_disjoint([a], [b])
    with pytest.raises(ValueError, match="patientId"):
        assert_disjoint([a], [{**b, "patientId": a["patientId"]}])
    with pytest.raises(ValueError, match="family"):
        assert_disjoint([a], [{**b, "family": a["family"]}])
    with pytest.raises(ValueError, match="prompt"):
        assert_disjoint([a], [{**a, "patientId": "new", "family": "new"}])
    with pytest.raises(ValueError, match="Duplicate"):
        validate([a, a])


def test_hash_covers_context_and_claim_not_only_passage():
    a = example(1)
    b = json.loads(json.dumps(a))
    b["passages"][0]["before"] = ["Invented prior context"]
    assert input_identity(a) != input_identity(b)
    assert digest(a) != digest(b)


def test_existing_translation_requires_complete_context():
    from bench.english import existing_translation

    row = example(1)
    assert existing_translation(row) is None
    row["passages"][0]["textEn"] = "Existing translated synthetic source"
    result = existing_translation(row)
    assert result["language"] == "en"
    assert result["passages"][0]["text"] == "Existing translated synthetic source"
    assert row["passages"][0]["text"] != result["passages"][0]["text"]
    row["passages"][0]["before"] = ["Untranslated context"]
    assert existing_translation(row) is None
    row["passages"][0]["beforeEn"] = ["Translated context"]
    assert existing_translation(row) is not None
