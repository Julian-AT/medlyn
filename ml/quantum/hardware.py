"""Bounded 16 by 16 IBM kernel block; dry run never connects or submits."""

import argparse
import json
import os
import time
from datetime import datetime
from pathlib import Path

import numpy as np
from qiskit import transpile
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
from sklearn.svm import SVC

from verifier.integrity import file_hash

from .features import CACHE, SEED, load_environment
from .kernel import feature_map

RESULTS = Path(__file__).with_name("results.json")


def overlap_circuits(features):
    circuits, pairs = [], []
    fmap = feature_map(features.shape[1])
    # Include diagonal circuits: their measured error must not be hidden by forcing ones.
    for i in range(len(features)):
        for j in range(i, len(features)):
            circuit = fmap.assign_parameters(features[i]).compose(
                fmap.assign_parameters(features[j]).inverse()
            )
            circuit.measure_all()
            circuits.append(circuit)
            pairs.append((i, j))
    return circuits, pairs


def elapsed(timestamps, start, end):
    if not timestamps.get(start) or not timestamps.get(end):
        return None
    return (
        datetime.fromisoformat(timestamps[end]) - datetime.fromisoformat(timestamps[start])
    ).total_seconds()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--shots", type=int, default=1024)
    parser.add_argument("--results", type=Path, default=RESULTS)
    parser.add_argument("--job-id", help="Resume a submitted job without resubmitting")
    args = parser.parse_args()
    if not 1 <= args.shots <= 4096:
        parser.error("Use between 1 and 4096 shots")
    features = np.load(CACHE / "features.npz")
    test = features["test"][:16]
    circuits, pairs = overlap_circuits(test)
    if args.dry_run:
        print(
            json.dumps(
                {
                    "status": "dry_run_no_submission",
                    "qubits": 8,
                    "blockSize": 16,
                    "circuits": len(circuits),
                    "shots": args.shots,
                    "logicalDepth": max(c.depth() for c in circuits),
                    "backend": "least-busy operational non-simulator, at least 8 qubits",
                },
                indent=2,
            )
        )
        return
    report = json.loads(args.results.read_text())
    started = time.perf_counter()
    feature_hash = file_hash(CACHE / "features.npz")
    metadata = json.loads((CACHE / "features.json").read_text())
    if report["dataset"].get("featureHash") != feature_hash:
        raise ValueError("Simulator report and feature arrays differ; rerun the report first")
    load_environment()
    service = QiskitRuntimeService(
        channel="ibm_quantum_platform", token=os.environ["IBM_QUANTUM_TOKEN"]
    )
    if args.job_id:
        record = report.get("hardware", {})
        if (
            record.get("featureHash") != feature_hash
            or args.job_id not in record.get("jobIds", [])
            or record.get("shots") != args.shots
        ):
            raise ValueError("Resume requires the original job, shots and unchanged feature arrays")
        job = service.job(args.job_id)
        backend = job.backend()
        depth = report.get("hardware", {}).get("transpiledDepth")
    else:
        backend = service.least_busy(min_num_qubits=8, operational=True, simulator=False)
        compiled = transpile(circuits, backend, optimization_level=3, seed_transpiler=SEED)
        depth = {
            "max": max(c.depth() for c in compiled),
            "median": float(np.median([c.depth() for c in compiled])),
        }
        sampler = SamplerV2(mode=backend, options={"max_execution_time": 120})
        job = sampler.run(compiled, shots=args.shots)
    report["hardware"] = {
        "status": "submitted",
        "featureHash": feature_hash,
        "featureEncoder": metadata["embeddingModel"],
        "backend": backend.name,
        "jobIds": [job.job_id()],
        "shots": args.shots,
        "blockSize": 16,
        "transpiledDepth": depth,
        "queueSeconds": None,
        "executionSeconds": None,
    }
    args.results.write_text(json.dumps(report, indent=2) + "\n")
    print(f"IBM job {job.job_id()} submitted/resumed; pending record saved", flush=True)
    result = job.result()
    matrix = np.zeros((16, 16))
    for pub, (i, j) in zip(result, pairs, strict=True):
        counts = pub.data.meas.get_counts()
        matrix[i, j] = matrix[j, i] = counts.get("0" * 8, 0) / sum(counts.values())
    kernels = np.load(CACHE / "kernels.npz")
    # Test-test entries are not SVC features. This separate diagnostic instead fits
    # 16 labelled test anchors and measures their resubstitution accuracy only.
    anchors = SVC(kernel="precomputed", C=1).fit(kernels["block_exact"], features["y_test"][:16])
    timestamps = job.metrics().get("timestamps", {})
    report["hardware"].update(
        {
            "status": "complete",
            "matrix": matrix.tolist(),
            "meanAbsoluteError": float(np.abs(matrix - kernels["block_exact"]).mean()),
            "wallSeconds": time.perf_counter() - started,
            "queueSeconds": elapsed(timestamps, "created", "running"),
            "executionSeconds": elapsed(timestamps, "running", "finished"),
            "timestamps": timestamps,
            "anchorResubstitutionAccuracy": float(
                np.mean(anchors.predict(matrix) == features["y_test"][:16])
            ),
            "heldoutHardwareSvmAccuracy": None,
            "accuracyLimitation": "A test-test block cannot replace the 16x400 test-train SVM rows. Anchor accuracy is resubstitution only.",
        }
    )
    report["status"] = (
        "offline_control_complete_gemini_pending"
        if metadata["embeddingModel"].startswith("offline")
        else "simulator_and_hardware_complete"
    )
    args.results.write_text(json.dumps(report, indent=2) + "\n")
    print("Hardware block recorded. Regenerate figures with python -m quantum.report --reuse")


if __name__ == "__main__":
    main()
