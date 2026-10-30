import json

import pytest

from verifier.build_dataset import family_split, patient_examples
from verifier.build_real_gold import real_examples
from verifier.common import Bridge, read_jsonl
from verifier.dataset_v2 import balanced_rewrites, build_v2
from verifier.integrity import freeze, verify_frozen
from verifier.prepare_rewrites import prepare
from verifier.sweep import configurations, sweep
from verifier.train import train


def synthetic_patient(i, family):
    quote = f"Die Läsion ist links und misst {i + 20} mm."
    return {
        "patient": {"id": f"fixture-{i}"},
        "family": family,
        "documents": [{"metadata": {"id": f"doc-{i}", "date": "2024-05-03"}, "text": quote}],
        "labels": {
            "facts": [
                {
                    "id": f"f-{i}",
                    "documentId": f"doc-{i}",
                    "kind": "imaging",
                    "labelEn": "Lesion",
                    "attrs": {"value": i + 20, "unit": "mm", "side": "left"},
                    "assertion": "present",
                    "temporalStatus": "stated",
                    "eventDate": None,
                    "datePrecision": None,
                    "start": 0,
                    "end": len(quote),
                    "quote": quote,
                }
            ],
            "mutations": [],
        },
    }


def fixture_source(tmp_path):
    source = tmp_path / "source"
    source.mkdir()
    chosen = {}
    for i in range(1000):
        family = f"authored-{i}"
        chosen.setdefault(family_split(family), family)
    rows = [
        synthetic_patient(i, chosen[name]) for i, name in enumerate(("train", "valid", "test") * 9)
    ]
    (source / "patients.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows))
    (source / "manifest.json").write_text("{}")
    return source


def test_v2_balanced_family_split_and_frozen_test(tmp_path):
    source = fixture_source(tmp_path)
    out = tmp_path / "out"
    result = build_v2(
        [source], out, caps={"train": 12, "valid": 9, "test": 9, "rewritten": 3}, dry_run=True
    )
    assert result["splits"]["train"]["rows"] == 12
    assert result["rewrittenPatientsAvailable"] == 0
    seen = set()
    for name in ("train", "valid", "test"):
        rows = list(read_jsonl(out / f"{name}.examples.jsonl"))
        families = {row["family"] for row in rows}
        assert not seen.intersection(families)
        seen.update(families)
    verify_frozen(out)
    with pytest.raises(ValueError, match="frozen"):
        build_v2([source], out)
    with (out / "test.examples.jsonl").open("a") as handle:
        handle.write("{}\n")
    with pytest.raises(ValueError, match="integrity"):
        verify_frozen(out)


def test_freeze_refuses_changed_rows(tmp_path):
    path = tmp_path / "test.examples.jsonl"
    path.write_text("[]")
    freeze(tmp_path)
    path.write_text("{}")
    with pytest.raises(ValueError, match="Frozen"):
        freeze(tmp_path)


def test_hard_negatives_change_explicit_values_and_scope():
    row = synthetic_patient(1, "a")
    with Bridge() as bridge:
        prepared = bridge.call(op="patient", row=row)
    original = prepared["facts"][0]
    prepared["facts"].append(
        {**original, "id": "second", "attrs": {**original["attrs"], "value": 35}}
    )
    mutations = list(patient_examples(row, "a", prepared))
    assert any(item["mutation"] == "number_swap" and "35" in item["claim"] for item in mutations)
    prepared["facts"][0].update(kind="diagnosis", assertion="present")
    assert any(
        item["mutation"] == "negation_scope" for item in patient_examples(row, "a", prepared)
    )


def test_train_dry_run_skips_test_and_mlx(tmp_path):
    data = tmp_path / "data"
    data.mkdir()
    rows = [{"messages": [{"role": "user", "content": "fixture"}]}] * 4
    for name in ("train", "valid"):
        (data / f"{name}.jsonl").write_text("".join(json.dumps(row) + "\n" for row in rows))
    result = train(data, tmp_path / "run", rank=16, epochs=2, dry_run=True)
    assert result["targetIterations"] == 2
    assert result["status"] == "dry_run"
    assert not (tmp_path / "run/training-data/test.jsonl").exists()
    assert (
        json.loads((tmp_path / "run/lora-config.json").read_text())["lora_parameters"]["rank"] == 16
    )
    assert len(configurations()) == 8


def test_rewrites_copy_only_preassigned_test_patients(tmp_path):
    result = prepare(fixture_source(tmp_path), tmp_path / "rewrite", count=2, dry_run=True)
    assert result["patients"] == 2
    assert all(row["split"] == "test" for row in read_jsonl(tmp_path / "rewrite/index.jsonl"))


def test_real_rules_keep_text_out_of_reference_metadata():
    row = synthetic_patient(1, "real-fixture")
    with Bridge() as bridge:
        prepared = bridge.call(op="patient", row=row)
    for doc in prepared["documents"]:
        for i, seg in enumerate(doc["segments"]):
            seg["id"] = f"{doc['id']}-s{i}"
    for fact in prepared["facts"]:
        fact.update(support="supported", locationOk=True, segmentId=f"{fact['documentId']}-s0")
    examples = real_examples({**prepared, "patientId": "fixture"}, limit=2)
    assert {item["label"] for item in examples} == {"supported", "contradicted"}
    assert all(item["source"] == "real_test_only" for item in examples)
    prepared["facts"][0]["end"] -= 1
    with pytest.raises(ValueError, match="quote"):
        real_examples({**prepared, "patientId": "fixture"}, limit=2)


def test_sweep_dry_run_has_no_winner_and_reuses_one_training_subset(tmp_path):
    data = tmp_path / "data"
    data.mkdir()
    rows = [
        {"metadata": {"label": label}, "messages": [{"role": "user", "content": "fixture"}]}
        for label in ("supported", "unsupported", "contradicted")
        for _ in range(4)
    ]
    text = "".join(json.dumps(row) + "\n" for row in rows)
    for name in ("train.jsonl", "valid.jsonl", "valid.examples.jsonl"):
        (data / name).write_text(text)
    report = sweep(data, tmp_path / "sweep", dry_run=True, train_limit=6)
    assert report["winner"] is None
    assert len(report["runs"]) == 8
    assert {row["status"] for row in report["runs"]} == {"dry_run"}
    assert len({row["trainSubsetSha256"] for row in report["runs"]}) == 1
    assert {row["trainExamples"] for row in report["runs"]} == {6}
    assert not (tmp_path / "sweep/sweep-data/test.jsonl").exists()


def test_rewrite_sampling_keeps_every_eligible_patient():
    rows = [
        {
            "patientId": f"patient-{patient}",
            "label": label,
            "claim": f"{patient}-{label}-{variant}",
            "passages": [],
        }
        for patient in range(30)
        for label in ("supported", "unsupported", "contradicted")
        for variant in range(5)
    ]
    selected = balanced_rewrites(rows, 90, 37)
    assert len(selected) == 90
    assert len({row["patientId"] for row in selected}) == 30
    assert all(
        sum(row["label"] == label for row in selected) == 30
        for label in ("supported", "unsupported", "contradicted")
    )
