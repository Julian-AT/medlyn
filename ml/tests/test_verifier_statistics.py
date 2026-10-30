import pytest

from verifier.evaluate import metrics
from verifier.evaluate_v2 import costs, summary
from verifier.statistics import (
    apply_temperature,
    bootstrap,
    calibration,
    cascade_predictions,
    choose_threshold,
    fit_temperature,
    scaled,
)


def predictions():
    return [
        {
            "inputHash": str(i),
            "patientId": f"patient-{i % 3}",
            "label": label,
            "prediction": label,
            "probability": 0.9,
            "probabilities": {
                key: 0.9 if key == label else 0.05
                for key in ("supported", "unsupported", "contradicted")
            },
            "latencyMs": 2,
            "mutation": "none",
        }
        for i, label in enumerate(("supported", "unsupported", "contradicted") * 10)
    ]


def test_perfect_cluster_bootstrap_and_confusion():
    report = summary(predictions(), 50)
    assert report["macroF1"] == 1
    assert report["macroF1CI95"]["unit"] == "patient"
    assert 0 <= report["macroF1CI95"]["low"] <= report["macroF1CI95"]["high"] <= 1
    assert report["perMutation"]["none"]["confusion"]["supported"]["supported"] == 10
    assert bootstrap(predictions(), 50) == bootstrap(predictions(), 50)


def test_bootstrap_empty_and_unavailable():
    assert bootstrap([], 20)["low"] is None
    rows = [{**row, "prediction": "unavailable"} for row in predictions()]
    assert bootstrap(rows, 20)["high"] == 0
    assert metrics(rows)["coverage"] == 0


def test_reliability_bins_include_one_and_do_not_invent_confidence():
    rows = [{**row, "probability": 1} for row in predictions()]
    assert calibration(rows)["reliability"][-1]["count"] == 30
    assert calibration(rows)["ece"] == 0
    rows[0]["probability"] = None
    assert calibration(rows)["coverage"] == 29 / 30
    assert calibration([])["ece"] is None


def test_temperature_selection_changes_confidence_without_labels():
    rows = predictions()
    temperature = fit_temperature(rows)
    assert temperature == 0.25
    changed = apply_temperature(rows, temperature)
    assert changed[0]["prediction"] == rows[0]["prediction"]
    assert changed[0]["probability"] > rows[0]["probability"]
    assert rows[0]["probability"] == 0.9
    assert sum(scaled(rows[0]["probabilities"], 1).values()) == pytest.approx(1)
    with pytest.raises(ValueError):
        fit_temperature([])
    with pytest.raises(ValueError):
        scaled(rows[0]["probabilities"], 0)


def test_threshold_uses_validation_correctness_and_can_disable_every_call():
    rows = predictions()
    rows[0] = {**rows[0], "prediction": "unsupported", "probability": 0.55}
    result = choose_threshold(rows)
    assert result["threshold"] == 0.9
    assert result["accepted"] == 29
    assert result["selectionSplit"] == "valid"
    assert not choose_threshold(rows[:3])["enabled"]


def test_cascade_savings_and_serial_latency():
    first = predictions()
    first[0]["probability"] = 0.1
    second = [{**row, "latencyMs": 10} for row in predictions()]
    rows, savings = cascade_predictions(first, second, {"enabled": True, "threshold": 0.8})
    assert savings["gptCallsSaved"] == 29
    assert rows[0]["latencyMs"] == 12
    assert rows[1]["latencyMs"] == 2
    second.reverse()
    with pytest.raises(ValueError, match="ordered"):
        cascade_predictions(first, second, {"enabled": True, "threshold": 0.8})


def test_unknown_tariff_and_missing_cached_usage_remain_null():
    rows = [{"usage": {"prompt_tokens": 100, "completion_tokens": 20}}]
    assert costs(rows)["usd"] is None
    assert costs(rows, 1, 2)["usd"] == pytest.approx(0.00014)
    assert costs(rows + [{}], 1, 2)["usd"] is None


def test_single_patient_intervals_are_explicitly_conditional():
    rows = [{**row, "patientId": "one-patient"} for row in predictions()]
    result = bootstrap(rows, 50)
    assert result["unit"] == "claim_within_single_patient"
    assert result["conditionalOnSinglePatient"] is True
