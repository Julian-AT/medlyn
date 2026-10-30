import pytest
import yaml

from publish.common import sha256, write_json
from publish.export_model import export_model
from publish.model_card import evaluation_table, model_card
from publish.selection import BASE, select_adapter


def make_v1(verifier):
    run = verifier / "runs/v1"
    run.mkdir(parents=True)
    adapters = verifier / "adapters"
    adapters.mkdir()
    (adapters / "adapters.safetensors").write_bytes(b"test-weights")
    (adapters / "0000100_adapters.safetensors").write_bytes(b"test-checkpoint")
    config = {"model": BASE, "max_seq_length": 512, "num_layers": 8, "lora_parameters": {"rank": 8}}
    write_json(adapters / "adapter_config.json", config)
    write_json(
        run / "run.json",
        {
            "status": "complete",
            "command": ["--adapter-path", str(adapters)],
            "targetIterations": 200,
        },
    )
    (run / "train.log").write_text(" 100 val 0.01\n 200 val 0.02\n")
    return config


def test_v1_uses_validation_checkpoint_and_model_card_has_required_keys(tmp_path):
    verifier = tmp_path / "verifier"
    config = make_v1(verifier)
    selected = select_adapter(verifier)
    assert selected["weights"].name == "0000100_adapters.safetensors"
    assert selected["selectionValue"] == 0.01
    card = model_card(selected, config, {"sets": {}}, False)
    metadata = yaml.safe_load(card.split("---", 2)[1])
    assert {"license", "base_model", "library_name", "tags"} <= metadata.keys()
    assert metadata["base_model"] == "Qwen/Qwen3-1.7B"
    assert "adapter_path=adapter" in card
    assert "Real-text performance is weak" in card


def test_v2_selection_uses_only_completed_compatible_validation_runs(tmp_path):
    verifier = tmp_path / "verifier"
    make_v1(verifier)
    data = verifier / "runs/data-v2"
    data.mkdir()
    (data / "valid.examples.jsonl").write_text("synthetic-validation-snapshot")
    runs = []
    for index, (score, coverage) in enumerate(((0.5, 1), (0.9, 1), (0.99, 0.9))):
        path = verifier / f"runs/sweep/run-{index}"
        (path / "adapters").mkdir(parents=True)
        (path / "adapters/adapters.safetensors").write_bytes(b"test-weights")
        write_json(path / "adapters/adapter_config.json", {"model": BASE})
        write_json(path / "run.json", {"status": "complete"})
        runs.append(
            {
                "id": path.name,
                "status": "complete",
                "model": BASE,
                "selectionSplit": "valid",
                "coverage": coverage,
                "macroF1": score,
                "validSha256": sha256(data / "valid.examples.jsonl"),
            }
        )
    write_json(
        verifier / "runs/sweep/selection.json",
        {"status": "complete", "selectionSplit": "valid", "runs": runs},
    )
    selected = select_adapter(verifier)
    assert selected["version"] == 2
    assert selected["selectionValue"] == 0.9
    write_json(
        verifier / "runs/sweep/selection.json",
        {"status": "complete", "selectionSplit": "test", "runs": runs},
    )
    with pytest.raises(ValueError, match="validation"):
        select_adapter(verifier)


def test_confidence_intervals_are_rendered_only_when_present():
    table = evaluation_table(
        {
            "sets": {
                "synthetic": {
                    "local": {
                        "n": 50,
                        "macroF1": 0.7,
                        "coverage": 1,
                        "macroF1CI95": {"low": 0.6, "high": 0.8, "unit": "patient"},
                    }
                }
            }
        }
    )
    assert "[0.6000, 0.8000] (patient)" in table
    assert "unmeasured" in table


def test_model_export_removes_local_paths_and_tracks_training_snapshot(tmp_path):
    from test_publish_dataset import make_scanner, make_source

    _, verifier = make_source(tmp_path)
    config = make_v1(verifier)
    data = verifier / "datasets"
    data.mkdir()
    for split in ("train", "valid", "test"):
        (data / f"{split}.examples.jsonl").write_text(
            (verifier / f"{split}.examples.jsonl").read_text()
        )
    config["data"] = "/local/private/training-data"
    write_json(verifier / "adapters/adapter_config.json", config)
    write_json(
        verifier / "results.json",
        {"sets": {}, "evaluationIdentity": {"testSha256": sha256(data / "test.examples.jsonl")}},
    )
    out = tmp_path / "hf/model"
    result = export_model(verifier, out, make_scanner())
    assert (out / "adapters.safetensors").read_bytes() == b"test-checkpoint"
    assert "/local/private" not in (out / "adapter_config.json").read_text()
    assert set(result["verifierFiles"]) == {
        "train.examples.jsonl",
        "valid.examples.jsonl",
        "test.examples.jsonl",
    }
    assert result["evaluationMatchesSelectedDatasetOrAdapter"] is True
