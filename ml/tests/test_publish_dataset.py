import json

import pyarrow.parquet as pq
import pytest
import yaml

from publish.common import read_json, write_json
from publish.export_dataset import export_dataset
from publish.scan import ChallengeScanner
from publish.scan_release import scan_release
from publish.verifier_data import verifier_rows


def make_scanner():
    return ChallengeScanner({str(index): chr(0x500 + index) * 240 for index in range(8)})


def make_source(folder):
    source, verifier = folder / "synthetic", folder / "verifier"
    (source / "shards").mkdir(parents=True)
    verifier.mkdir()
    index, records = [], []
    for number, split in enumerate(("train", "val", "test")):
        patient, family = f"synth-{number:06d}", f"family-{number}"
        index.append({"patientId": patient, "family": family, "split": split})
        records.append(
            {
                "patient": {"id": patient},
                "generation": {"family": family, "split": split},
                "documents": [
                    {
                        "metadata": {
                            "id": f"doc-{number}",
                            "title": "Synthetic note",
                            "date": "2026-01-01",
                            "type": "consult",
                            "department": "research",
                        },
                        "text": "Freely authored synthetic record.",
                    }
                ],
                "labels": {
                    key: []
                    for key in ("facts", "mutations", "contradictions", "distractors", "gaps")
                },
            }
        )
        example = {
            "patientId": patient,
            "family": family,
            "source": "synthetic",
            "documentId": f"doc-{number}",
            "claim": "An authored test claim.",
            "label": "supported",
            "assertion": "present",
            "timing": "stated",
            "mutation": "none",
            "start": 0,
            "end": 10,
            "passages": [{"text": "An independent authored test passage."}],
        }
        (verifier / f"{('valid' if split == 'val' else split)}.examples.jsonl").write_text(
            json.dumps(example) + "\n"
        )
    (source / "index.jsonl").write_text("".join(json.dumps(row) + "\n" for row in index))
    (source / "shards/part-0000.jsonl").write_text(
        "".join(json.dumps(row) + "\n" for row in records)
    )
    write_json(
        source / "manifest.json", {"nPatients": 3, "generatorVersion": "fixture", "seed": 37}
    )
    # Non-synthetic files must never be discovered, parsed or copied.
    (verifier / "real.examples.jsonl").write_text("deliberately invalid JSON")
    (verifier / "predictions-real_hidden.jsonl").write_text("deliberately invalid JSON")
    return source, verifier


def test_export_has_stable_schema_disjoint_splits_and_required_card_yaml(tmp_path):
    source, verifier = make_source(tmp_path)
    out = tmp_path / "hf/dataset"
    release = export_dataset(
        source, verifier, out, make_scanner(), expected=3, subset_size=3, shard_size=1
    )
    assert release["counts"] == {
        config: {"train": 1, "validation": 1, "test": 1} for config in ("full", "10k", "verifier")
    }
    for config in ("full", "10k", "verifier"):
        seen = set()
        for split in ("train", "validation", "test"):
            rows = pq.read_table(out / config / split / "part-00000.parquet").to_pylist()
            ids = {row["patient_id" if config == "verifier" else "id"] for row in rows}
            assert not seen.intersection(ids)
            seen.update(ids)
            if config != "verifier":
                assert json.loads(rows[0]["facts"]) == []
                assert rows[0]["documents"][0]["department"] == "research"
    card = (out / "README.md").read_text()
    metadata = yaml.safe_load(card.split("---", 2)[1])
    assert {
        "license",
        "language",
        "task_categories",
        "size_categories",
        "configs",
    } <= metadata.keys()
    assert metadata["license"] == "cc-by-4.0"
    assert [item["config_name"] for item in metadata["configs"]] == ["full", "10k", "verifier"]
    assert read_json(out / "scan-report.json")["matchCount"] == 0
    assert not list(out.rglob("*real*"))
    rescanned = scan_release(out, make_scanner())
    assert rescanned["matchCount"] == 0
    assert rescanned["recordsScanned"] == 10
    with pytest.raises(FileExistsError):
        export_dataset(source, verifier, out, make_scanner(), expected=3, subset_size=3)


def test_real_verifier_rows_are_rejected(tmp_path):
    _, verifier = make_source(tmp_path)
    path = verifier / "train.examples.jsonl"
    row = json.loads(path.read_text())
    row["source"] = "real"
    path.write_text(json.dumps(row) + "\n")
    with pytest.raises(ValueError, match="non-synthetic"):
        list(verifier_rows(verifier, make_scanner()))


def test_scan_failure_cleans_staging_and_writes_report(tmp_path):
    source, verifier = make_source(tmp_path)
    scan = make_scanner()
    path = source / "shards/part-0000.jsonl"
    records = [json.loads(line) for line in path.read_text().splitlines()]
    records[0]["documents"][0]["text"] = chr(0x500) * 120
    path.write_text("".join(json.dumps(row) + "\n" for row in records))
    out = tmp_path / "hf/dataset"
    with pytest.raises(ValueError, match="release aborted"):
        export_dataset(source, verifier, out, scan, expected=3, subset_size=3)
    assert not out.exists()
    assert not list(out.parent.glob(".dataset-*"))
    assert read_json(out.parent / "scan-report.json")["status"] == "failed"
