import json
from pathlib import Path

import numpy as np
import pytest


def test_saved_results_are_complete_and_honest_about_provenance():
    path = Path(__file__).resolve().parents[1] / "quantum/results.json"
    if not path.exists():
        pytest.skip("Simulator report not generated")
    result = json.loads(path.read_text())
    assert result["humanChecked"] is False
    assert result["dataset"]["train"] == 400
    assert result["dataset"]["test"] == 200
    assert len(set(result["dataset"]["trainIds"])) == 400
    assert len(set(result["dataset"]["testIds"])) == 200
    assert result["dataset"]["featureHash"]
    if result["dataset"]["embeddingModel"].startswith("offline"):
        assert "gemini" in result["status"]
        assert result["dataset"]["geminiStatus"] != "complete"
    block = np.array(result["kernel"]["simulatorBlock"]["exact"])
    assert block.shape == (16, 16)
    assert np.allclose(block, block.T)
    for row in result["kernel"]["models"].values():
        assert row["accuracyCI95"][0] <= row["accuracy"] <= row["accuracyCI95"][1]
    instances = result["qaoa"]["instances"]
    assert len(instances) >= 5
    for instance in instances:
        assert 8 <= len(instance["candidateIds"]) <= 10
        assert [run["p"] for run in instance["qaoa"]] == [1, 2, 3]
        for run in instance["qaoa"]:
            assert 0 <= run["optimalProbability"] <= run["feasibleProbability"] <= 1 + 1e-10
    if result["hardware"]["status"] != "complete":
        assert not result["hardware"].get("matrix")
