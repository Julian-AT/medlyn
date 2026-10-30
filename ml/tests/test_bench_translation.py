from copy import deepcopy

import pytest

from bench.nli import binary_result
from bench.translate import validate_translation


def passages():
    return [
        {
            "text": "Invented source value 12 mg",
            "section": None,
            "before": ["Prior invented value 3"],
            "after": [],
            "documentDate": "2001-01-01",
        }
    ]


def test_translation_preserves_numeric_evidence_and_shape():
    original = passages()
    translated = deepcopy(original)
    translated[0]["text"] = "Translated invented source value 12 mg"
    validate_translation(original, translated)
    translated[0]["text"] = "Changed invented value 15 mg"
    with pytest.raises(ValueError, match="numeric evidence"):
        validate_translation(original, translated)


def test_translation_rejects_missing_context_and_changed_metadata():
    original = passages()
    translated = deepcopy(original)
    translated[0]["before"] = []
    with pytest.raises(ValueError, match="context shape"):
        validate_translation(original, translated)
    translated = deepcopy(original)
    translated[0]["documentDate"] = "2002-01-01"
    with pytest.raises(ValueError, match="metadata"):
        validate_translation(original, translated)
    with pytest.raises(ValueError, match="passage count"):
        validate_translation(original, [])


def test_binary_threshold_matches_official_minicheck_strict_boundary():
    assert binary_result(0.5)["label"] == "not_supported"
    assert binary_result(0.5001)["label"] == "supported"
    with pytest.raises(ValueError):
        binary_result(float("nan"))
