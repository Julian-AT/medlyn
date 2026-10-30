import pytest

from bench.cache import evaluate
from bench.io import ignored_directory, input_identity, read
from verifier.evaluate import input_hash


def example():
    return {
        "claim": "Synthetic claim",
        "passages": [{"text": "Synthetic passage", "before": [], "after": []}],
        "label": "supported",
        "mutation": "none",
    }


def test_cache_identity_includes_system_and_inputs(tmp_path, monkeypatch):
    monkeypatch.setattr("bench.io.BENCH", tmp_path)
    path = tmp_path / "results/predictions.jsonl"
    calls = []

    def predict(row):
        calls.append(row)
        return {"label": "supported"}

    first = evaluate([example()], predict, "v1", path)
    second = evaluate([example()], predict, "v1", path)
    assert len(calls) == 1
    assert second[0]["cacheHit"]
    assert first[0]["latencyMs"] == second[0]["latencyMs"]
    evaluate([example()], predict, "v2", path)
    assert len(calls) == 2
    assert read(path)[0]["systemIdentity"] == "v2"


def test_legacy_proxy_reuses_exact_input_and_current_label(tmp_path, monkeypatch):
    monkeypatch.setattr("bench.io.BENCH", tmp_path)
    row = example()
    legacy = {
        input_hash(row): {"prediction": "unsupported", "label": "unsupported", "latencyMs": 123}
    }
    result = evaluate([row], None, "judge", tmp_path / "results/cached.jsonl", legacy, 0)
    assert result[0]["label"] == "supported"
    assert result[0]["prediction"] == "unsupported"
    assert result[0]["inputHash"] == input_identity(row)
    assert result[0]["latencyMs"] == 123


def test_budget_checked_before_requests_and_unavailable_retried(tmp_path, monkeypatch):
    monkeypatch.setattr("bench.io.BENCH", tmp_path)
    path = tmp_path / "results/cached.jsonl"
    with pytest.raises(ValueError, match="budget"):
        evaluate([example()], None, "judge", path, budget=0)

    def unavailable(row):
        raise RuntimeError("Sensitive error details must not be persisted")

    values = evaluate([example()], unavailable, "judge", path)
    assert values[0]["prediction"] == "unavailable"
    assert "Sensitive" not in path.read_text()
    values = evaluate([example()], lambda row: {"label": "supported"}, "judge", path)
    assert values[0]["prediction"] == "supported"
    assert not values[0]["cacheHit"]


def test_text_output_cannot_escape_ignored_benchmark_directories(tmp_path):
    with pytest.raises(ValueError, match="Text artifacts"):
        ignored_directory(tmp_path / "exposed")


def test_parallel_requests_preserve_order_and_timings(tmp_path, monkeypatch):
    monkeypatch.setattr("bench.io.BENCH", tmp_path)
    rows = [{**example(), "claim": f"Invented claim {i}"} for i in range(7)]
    first = evaluate(
        rows,
        lambda row: {"label": "supported"},
        "parallel",
        tmp_path / "results/parallel.jsonl",
        budget=7,
        workers=3,
    )
    assert [r["inputHash"] for r in first] == [input_identity(r) for r in rows]
    assert not any(r["cacheHit"] for r in first)
    second = evaluate(
        rows, None, "parallel", tmp_path / "results/parallel.jsonl", budget=0, workers=3
    )
    assert all(r["cacheHit"] for r in second)
    assert [r["latencyMs"] for r in first] == [r["latencyMs"] for r in second]
