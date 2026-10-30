import pytest

from bench.costs import costs
from bench.inference import intervals, paired
from bench.metrics import calibration, summarize


def rows():
    return [
        {
            "inputHash": str(i),
            "patientId": f"p-{i // 3}",
            "label": label,
            "prediction": label,
            "latencyMs": 2,
            "probabilities": {
                key: 0.8 if key == label else 0.1
                for key in ("supported", "unsupported", "contradicted")
            },
        }
        for i, label in enumerate(("supported", "unsupported", "contradicted") * 4)
    ]


def test_perfect_metrics_and_fixed_seed_intervals():
    values = rows()
    result = summarize(values)
    assert result["macroF1"] == result["binaryF1"] == result["balancedAccuracy"] == 1
    assert result["calibration"]["ece"] == pytest.approx(0.2)
    assert intervals(values) == intervals(values)
    assert intervals(values)["macroF1"] == [1, 1]
    assert result["classes"]["supported"]["support"] == 4


def test_abstentions_are_errors_in_both_spaces():
    values = rows()
    for row in values:
        row.update(prediction="unavailable", probabilities=None)
    result = summarize(values)
    assert result["macroF1"] == result["binaryF1"] == result["balancedAccuracy"] == 0
    assert result["coverage"] == 0
    assert result["latencyMs"]["n"] == 0
    assert result["calibration"]["ece"] is None


def test_binary_baseline_has_no_fabricated_three_way_score():
    values = [
        {
            "inputHash": "a",
            "label": "contradicted",
            "prediction": "not_supported",
            "latencyMs": 1,
            "probabilities": {"supported": 0.1, "not_supported": 0.9},
        },
        {
            "inputHash": "b",
            "label": "supported",
            "prediction": "supported",
            "latencyMs": 1,
            "probabilities": {"supported": 0.7, "not_supported": 0.3},
        },
    ]
    result = summarize(values, True)
    assert result["macroF1"] is None
    assert result["balancedAccuracy"] == result["binaryF1"] == 1
    assert result["calibration"]["ece"] == pytest.approx(0.2)
    assert "macroF1" not in intervals(values, True)


def test_bad_probability_vectors_fail_closed():
    values = rows()
    values[0]["probabilities"]["supported"] = float("nan")
    with pytest.raises(ValueError, match="Invalid probability"):
        calibration(values)
    values[0]["probabilities"]["supported"] = 0.5
    with pytest.raises(ValueError, match="sum to one"):
        calibration(values)


def test_pairing_matches_inputs_and_references_exactly():
    values = rows()
    assert paired(values, list(reversed(values)))["tests"]["macroF1"]["ci95"] == [0, 0]
    with pytest.raises(ValueError, match="match exactly"):
        paired(values, values[:-1])
    other = [r.copy() for r in values]
    other[0]["label"] = "unsupported"
    with pytest.raises(ValueError, match="reference labels"):
        paired(values, other)


def test_paired_difference_uses_patient_clusters():
    first = rows()
    other = [{**r, "prediction": "unavailable"} for r in first]
    result = paired(first, other)
    assert result["unit"] == "patient_or_document"
    assert result["tests"]["macroF1"]["deltaLeftMinusRight"] == 1
    assert result["tests"]["macroF1"]["pTwoSidedCenteredBootstrap"] < 0.01
    for row in first:
        row["patientId"] = "one-patient"
    assert intervals(first)["unit"] == "claim_conditional_on_single_patient"


def test_unknown_tariff_is_null_and_explicit_tariff_is_normalized():
    values = [{"usage": {"prompt_tokens": 100, "completion_tokens": 10}}]
    assert costs(values, True)["apiUsdPer1000Claims"] is None
    assert costs(values, True, 2, 4)["apiUsdPer1000Claims"] == pytest.approx(0.24)
    assert costs(values)["localComputeUsdPer1000Claims"] is None


def test_single_binary_class_does_not_imply_balanced_performance():
    values = [
        {
            "inputHash": "only-negative",
            "label": "contradicted",
            "prediction": "unsupported",
            "latencyMs": 1,
        }
    ]
    result = summarize(values)
    assert result["binaryF1"] is None
    assert result["balancedAccuracy"] is None
    assert "balancedAccuracy" not in intervals(values)
    assert paired(values, values)["tests"].keys() == {"macroF1"}
