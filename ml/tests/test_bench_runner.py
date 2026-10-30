from types import SimpleNamespace

import pytest

from bench.export import export
from bench.io import write_json
from bench.run import aggregate, run_system
from bench.suites import load_suites, prepare
from verifier.common import write_jsonl
from verifier.integrity import file_hash, freeze


def fixture_data(tmp_path, monkeypatch):
    monkeypatch.setattr("bench.io.BENCH", tmp_path)
    data = tmp_path / "data"
    data.mkdir()
    for split, prefix in (
        ("train", "train"),
        ("valid", "valid"),
        ("test", "test"),
        ("rewritten", "rewrite"),
    ):
        rows = [
            {
                "claim": f"Claim {prefix} {i}",
                "passages": [
                    {"text": f"Evidence {prefix} {i}", "section": None, "before": [], "after": []}
                ],
                "label": label,
                "family": prefix,
                "patientId": f"{prefix}-{i}",
                "mutation": "side_flip" if split == "test" else "none",
            }
            for i, label in enumerate(("supported", "unsupported", "contradicted"))
        ]
        write_jsonl(data / f"{split}.examples.jsonl", rows)
    write_json(data / "manifest.json", {"heldOutMutationTypes": ["side_flip"]})
    freeze(data)
    out = tmp_path / "results"
    out.mkdir()
    prepare(data, out, 3)
    return data, out


def test_freeze_detects_tampering(tmp_path, monkeypatch):
    _, out = fixture_data(tmp_path, monkeypatch)
    load_suites(out)
    with (out / "synthetic-families.jsonl").open("a") as handle:
        handle.write("\n")
    with pytest.raises(ValueError, match="changed"):
        load_suites(out)


def test_dry_runner_never_loads_models_and_paper_remains_pending(tmp_path, monkeypatch):
    data, out = fixture_data(tmp_path, monkeypatch)
    monkeypatch.setattr("bench.run.BENCH", tmp_path)
    args = SimpleNamespace(
        out=out,
        data=data,
        systems=["base-1.7b", "gpt"],
        dry_run=True,
        bootstrap=1000,
        input_usd_per_million=None,
        output_usd_per_million=None,
    )
    result = run_system(args)
    assert all(v["status"] == "dry_run" for v in result.values())
    report = aggregate(args)
    assert report["sets"] == {}
    exported = export(out / "benchmark.json", generated=tmp_path / "generated")
    assert not exported["approved"]
    assert "pending" in (tmp_path / "generated/bench-table.tex").read_text()
    assert len((tmp_path / "generated/bench_latency.dat").read_text().splitlines()) == 1


def test_real_rule_bridge_and_aggregate(tmp_path, monkeypatch):
    data, out = fixture_data(tmp_path, monkeypatch)
    monkeypatch.setattr("bench.run.BENCH", tmp_path)
    args = SimpleNamespace(
        out=out,
        data=data,
        systems=["rules"],
        dry_run=False,
        bootstrap=1000,
        input_usd_per_million=None,
        output_usd_per_million=None,
        proxy_budget=0,
    )
    result = run_system(args)
    assert result["rules"]["status"] == "measured"
    report = aggregate(args)
    assert report["sets"]["synthetic-families"]["rules"]["n"] == 3
    assert report["sets"]["synthetic-families"]["rules"]["coverage"] == 1
    review = tmp_path / "review.json"
    write_json(
        review,
        {"reviewedBy": "test reviewer", "benchmarkSha256": file_hash(out / "benchmark.json")},
    )
    assert export(out / "benchmark.json", review, tmp_path / "generated")["approved"]
    with (out / "benchmark.json").open("a") as handle:
        handle.write("\n")
    assert not export(out / "benchmark.json", review, tmp_path / "generated")["approved"]


def test_selection_and_external_models_are_explicitly_skipped(tmp_path, monkeypatch):
    _, out = fixture_data(tmp_path, monkeypatch)
    args = SimpleNamespace(
        out=out, systems=["ours-v2", "bespoke-7b"], dry_run=False, selection=tmp_path / "absent"
    )
    result = run_system(args)
    assert result["ours-v2"]["status"] == "skipped"
    assert result["bespoke-7b"]["status"] == "skipped"
    assert "CUDA" in result["bespoke-7b"]["detail"]
