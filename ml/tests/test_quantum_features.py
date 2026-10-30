import json
from pathlib import Path

import numpy as np
import pytest

from quantum.features import (
    Embeddings,
    formatted,
    load_splits,
    pair_features,
    reduce_features,
    sample_split,
    unit,
)


def test_balanced_sampling_is_deterministic():
    rows = [
        {"id": i, "label": label}
        for label in ("supported", "unsupported", "contradicted")
        for i in range(30)
    ]
    selected = sample_split(rows, 40)
    assert selected == sample_split(rows, 40)
    assert sum(r["label"] == "supported" for r in selected) == 20
    with pytest.raises(ValueError, match="multiple of four"):
        sample_split(rows, 7)
    with pytest.raises(ValueError, match="Insufficient"):
        sample_split(rows, 400)


def test_train_only_transform_is_deterministic_and_clips_test():
    rng = np.random.default_rng(4)
    features = pair_features(rng.normal(size=(32, 12)), rng.normal(size=(32, 12)))
    first = reduce_features(features[:24], features[24:])
    second = reduce_features(features[:24], features[24:] * 1000)
    assert np.array_equal(first[0], second[0])
    assert np.allclose(first[0], reduce_features(features[:24], features[24:])[0])
    assert (second[1] >= 0).all() and (second[1] <= np.pi).all()
    assert features.shape == (32, 25)


def test_embedding_validation_and_task_cache_identity(tmp_path):
    with pytest.raises(ValueError, match="nonzero"):
        unit(np.zeros(4))
    with pytest.raises(ValueError, match="finite"):
        unit(np.array([float("nan")]))
    with pytest.raises(ValueError, match="budget"):
        Embeddings(tmp_path, requests_per_minute=61)
    cache = Embeddings(tmp_path)
    assert cache.path("example", "RETRIEVAL_QUERY") != cache.path("example", "RETRIEVAL_DOCUMENT")
    assert formatted("example", "RETRIEVAL_DOCUMENT") == "title: none | text: example"


def test_reject_real_patient_even_with_frozen_lock(tmp_path):
    row = {"source": "synthetic", "patientId": "patient-0000-0001", "family": "a"}
    (tmp_path / "frozen-test.json").write_text("{}")
    (tmp_path / "manifest.json").write_text(json.dumps({"version": 2, "assignment": {}}))
    (tmp_path / "train.examples.jsonl").write_text(json.dumps(row))
    with pytest.raises(ValueError, match="Non-synthetic"):
        load_splits(tmp_path, 4, 4)


def test_runtime_frozen_split_separation():
    data = Path(__file__).resolve().parents[1] / "verifier/runs/data-v2"
    if not data.exists():
        pytest.skip("Local frozen synthetic dataset absent")
    train, test, provenance = load_splits(data)
    assert len(train) == 400 and len(test) == 200
    assert not {r["patientId"] for r in train} & {r["patientId"] for r in test}
    assert not {r["family"] for r in train} & {r["family"] for r in test}
    assert provenance["frozenTestHashes"]
