"""Package the best validation-selected compatible MLX adapter without uploading."""

import argparse
import json
import shutil
import tempfile
from pathlib import Path

from .common import HF, ML, inventory, read_json, sha256, write_json
from .model_card import model_card
from .scan import ChallengeScanner
from .selection import select_adapter
from .verifier_data import VERIFIER_FILES, verifier_rows


def export_model(verifier, destination, scanner):
    if destination.exists():
        raise FileExistsError("Model destination already exists; use a fresh output directory")
    selection = select_adapter(verifier)
    hashes = {name: sha256(selection["data"] / name) for name in VERIFIER_FILES.values()}
    # Check all source examples without discovering any real-patient files.
    for _ in verifier_rows(selection["data"], scanner):
        pass
    config = read_json(selection["config"])
    for key in (
        "adapter_path",
        "data",
        "config",
        "resume_adapter_file",
        "project_name",
        "report_to",
    ):
        config.pop(key, None)
    scanner.check(config, "adapter_config.json")
    results_path = verifier / "results.json"
    results_hash = sha256(results_path)
    results = read_json(results_path)
    identity = results.get("evaluationIdentity", {})
    evaluation_matches = selection["version"] == 1 and identity.get("testSha256") == sha256(
        selection["data"] / "test.examples.jsonl"
    )
    if selection["version"] == 2:
        from verifier.artifacts import model_identity

        evaluation_matches = identity.get("verifierIdentity") == model_identity(
            config["model"], selection["config"].parent
        )
    card = model_card(selection, config, results, evaluation_matches)
    scanner.check(card, "README.md")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=".model-", dir=destination.parent))
    try:
        before = sha256(selection["weights"])
        shutil.copyfile(selection["weights"], temporary / "adapters.safetensors")
        if (
            sha256(temporary / "adapters.safetensors") != before
            or sha256(selection["weights"]) != before
        ):
            raise ValueError("Selected adapter changed during export")
        if any(sha256(selection["data"] / name) != digest for name, digest in hashes.items()):
            raise ValueError("Verifier examples changed during model export")
        if sha256(results_path) != results_hash:
            raise ValueError("Evaluation results changed during model export")
        write_json(temporary / "adapter_config.json", config)
        (temporary / "README.md").write_text(card)
        write_json(temporary / "scan-report.json", scanner.report())
        files = inventory(temporary)
        release = {
            "kind": "model",
            "repoId": "JulianAT/medlyn-verifier-qwen3-1.7b-lora",
            "syntheticOnly": True,
            "files": files,
            "bytes": sum(file["bytes"] for file in files.values()),
            "selection": {
                key: value
                for key, value in selection.items()
                if key not in {"weights", "config", "data", "training"}
            },
            "verifierSource": selection["data"].name,
            "verifierFiles": hashes,
            "evaluationSha256": results_hash,
            "evaluationMatchesSelectedDatasetOrAdapter": evaluation_matches,
        }
        write_json(temporary / "release-manifest.json", release)
        temporary.rename(destination)
        return release
    except Exception:
        shutil.rmtree(temporary)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verifier", type=Path, default=ML / "verifier")
    parser.add_argument("--out", type=Path, default=HF / "medlyn-verifier-qwen3-1.7b-lora")
    args = parser.parse_args()
    release = export_model(
        args.verifier.resolve(), args.out.resolve(), ChallengeScanner.from_environment()
    )
    print(
        json.dumps(
            {
                key: release[key]
                for key in ("bytes", "selection", "evaluationMatchesSelectedDatasetOrAdapter")
            }
        )
    )


if __name__ == "__main__":
    main()
