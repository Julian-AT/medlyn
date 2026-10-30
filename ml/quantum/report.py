"""Run all CPU experiments and regenerate aggregate figures without patient text."""

import argparse
import importlib.metadata
import json
import time
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from verifier.integrity import file_hash

from . import kernel, qaoa
from .features import CACHE, ML, SEED, load_environment, load_splits, prepare

HERE = Path(__file__).resolve().parent


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False, default=lambda v: v.item()) + "\n")


def figures(result):
    data = HERE / "figures"
    data.mkdir(exist_ok=True)
    models = result["kernel"]["models"]
    lines = ["model accuracy low high macro_f1"]
    for name, row in models.items():
        lines.append(
            f"{name} {row['accuracy']} {row['accuracyCI95'][0]} {row['accuracyCI95'][1]} {row['macroF1']}"
        )
    (data / "accuracy.dat").write_text("\n".join(lines) + "\n")
    lines = ["p ratio optimal feasible"]
    for p in (1, 2, 3):
        runs = [i["qaoa"][p - 1] for i in result["qaoa"]["instances"]]
        lines.append(
            f"{p} {np.mean([r['conditionalExpectedRatio'] for r in runs])} "
            f"{np.mean([r['optimalProbability'] for r in runs])} "
            f"{np.mean([r['feasibleProbability'] for r in runs])}"
        )
    (data / "qaoa.dat").write_text("\n".join(lines) + "\n")
    block = result["kernel"]["simulatorBlock"]
    hardware = result["hardware"].get("matrix")
    lines = ["x y exact sampled hardware"]
    for i in range(16):
        for j in range(16):
            value = hardware[i][j] if hardware else "nan"
            lines.append(f"{i} {j} {block['exact'][i][j]} {block['sampled'][i][j]} {value}")
        lines.append("")
    (data / "kernel.dat").write_text("\n".join(lines) + "\n")
    write_json(
        data / "summary.json",
        {
            "humanChecked": False,
            "featureEncoder": result["dataset"]["embeddingModel"],
            "geminiStatus": result["dataset"]["geminiStatus"],
            "models": models,
            "hardwareStatus": result["hardware"]["status"],
            "qaoaInstances": 5,
        },
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=ML / "verifier/runs/data-v2")
    parser.add_argument(
        "--reuse", action="store_true", help="Regenerate figures from saved aggregates"
    )
    parser.add_argument("--cached-features", action="store_true")
    parser.add_argument("--offline-features", action="store_true")
    args = parser.parse_args()
    path = HERE / "results.json"
    if args.reuse:
        figures(json.loads(path.read_text()))
        return
    load_environment()
    started = time.perf_counter()
    metadata = (
        json.loads((CACHE / "features.json").read_text())
        if args.cached_features
        else prepare(args.data, offline=args.offline_features)
    )
    if args.cached_features:
        _, _, provenance = load_splits(args.data)
        if metadata["provenance"] != provenance:
            raise ValueError("Cached features do not match the frozen input files")
    if metadata.get("featureHash") != file_hash(CACHE / "features.npz"):
        raise ValueError("Feature arrays changed; regenerate features")
    data = np.load(CACHE / "features.npz")
    print("Running full kernels and classical baselines", flush=True)
    k_result = kernel.run(data, metadata, CACHE)
    blocks = np.load(CACHE / "kernels.npz")
    k_result["simulatorBlock"] = {
        "exact": blocks["block_exact"].tolist(),
        "sampled": blocks["block_sampled"].tolist(),
    }
    old = json.loads(path.read_text()) if path.exists() else {}
    previous_hardware = old.get("hardware", {})
    if previous_hardware.get("featureHash") != metadata["featureHash"]:
        previous_hardware = {}
    result = {
        "version": 1,
        "status": "offline_control_complete_gemini_and_hardware_pending"
        if metadata["embeddingModel"].startswith("offline")
        else "simulator_complete_hardware_pending",
        "humanChecked": False,
        "generatedAt": datetime.now(UTC).isoformat(),
        "seed": SEED,
        "scope": "Synthetic-only exploratory experiment; not used in product; no clinical advantage established",
        "packages": {
            name: importlib.metadata.version(name)
            for name in (
                "qiskit",
                "qiskit-aer",
                "qiskit-machine-learning",
                "qiskit-optimization",
                "qiskit-ibm-runtime",
                "scikit-learn",
                "numpy",
            )
        },
        "dataset": {k: v for k, v in metadata.items() if k not in ("testPatients", "testFamilies")},
        "kernel": k_result,
        "qaoa": qaoa.run(offline=metadata["embeddingModel"].startswith("offline")),
        "hardware": previous_hardware
        or {
            "status": "not_run_no_token_in_lane",
            "backend": None,
            "jobIds": [],
            "shots": None,
            "queueSeconds": None,
            "executionSeconds": None,
        },
        "limitations": [
            "Automated, human review pending; not publication-ready measurements",
            "Binary task merges unsupported and contradicted; not comparable to three-class verifier scores",
            "No hyperparameter selection; all baselines use the same train-fitted eight PCA features",
            "Exact statevector kernel replaces full finite-shot computation; finite-shot cross-check is 16x16",
            "Kernel concentration and eight-qubit compression can discard clinically important distinctions",
            "QAOA uses five tiny surrogate instances and ideal expectations; brute force is practical here",
            "No same-subset LoRA/GPT predictions or hardware measurements available",
            "Gemini quota exhausted: offline control uses character hashing, not semantic embeddings"
            if metadata["embeddingModel"].startswith("offline")
            else "Gemini embedding pipeline completed",
        ],
        "totalSeconds": time.perf_counter() - started,
    }
    write_json(path, result)
    figures(result)
    print(
        json.dumps({name: row["accuracy"] for name, row in k_result["models"].items()}), flush=True
    )


if __name__ == "__main__":
    main()
