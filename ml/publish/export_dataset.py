"""Export scanned synthetic patients and verifier examples to Hub-ready Parquet configs."""

import argparse
import json
import shutil
import tempfile
from collections import Counter
from pathlib import Path

from .common import HF, ML, inventory, read_json, read_jsonl, sha256, write_json
from .dataset_card import dataset_card
from .parquet import LABEL_COLUMNS, PATIENT_SCHEMA, VERIFIER_SCHEMA, Shards
from .scan import ChallengeScanner
from .splits import SplitGuard, split_name, stratified_subset
from .verifier_data import VERIFIER_FILES, verifier_rows


def export_dataset(
    source, verifier, destination, scanner, expected=100000, subset_size=10000, shard_size=1000
):
    if destination.exists():
        raise FileExistsError("Dataset destination already exists; use a fresh output directory")
    manifest_hash = sha256(source / "manifest.json")
    source_manifest = read_json(source / "manifest.json")
    index = list(read_jsonl(source / "index.jsonl"))
    if len(index) != expected or source_manifest["nPatients"] != expected:
        raise ValueError("Source patient count does not match the expected release size")
    selected = stratified_subset(index, subset_size)
    indexed = {row["patientId"]: row for row in index}
    input_hashes = {name: sha256(verifier / name) for name in VERIFIER_FILES.values()}
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=".dataset-", dir=destination.parent))
    guard, verifier_guard = SplitGuard(), SplitGuard()
    writers = {
        "full": Shards(temporary, "full", PATIENT_SCHEMA, shard_size),
        "10k": Shards(temporary, "10k", PATIENT_SCHEMA, shard_size),
        "verifier": Shards(temporary, "verifier", VERIFIER_SCHEMA, shard_size),
    }
    source_hashes = {}
    try:
        paths = sorted((source / "shards").glob("*.jsonl"))
        for path in paths:
            before = sha256(path)
            for record in read_jsonl(path):
                patient = record["patient"]["id"]
                generation = record["generation"]
                family, split = generation["family"], split_name(generation["split"])
                guard.add(patient, family, split, unique=True)
                entry = indexed.get(patient)
                if not entry or (entry["family"], split_name(entry["split"])) != (family, split):
                    raise ValueError("Source index disagrees with patient metadata")
                scanner.check(record, patient)
                row = {
                    "id": patient,
                    "family": family,
                    "split": split,
                    "documents": [
                        {**document["metadata"], "text": document["text"]}
                        for document in record["documents"]
                    ],
                    **{
                        key: json.dumps(record["labels"][key], ensure_ascii=False)
                        for key in LABEL_COLUMNS
                    },
                }
                writers["full"].add(row)
                if patient in selected:
                    writers["10k"].add(row)
            if sha256(path) != before:
                raise ValueError(
                    "Synthetic shard changed during export; retry from a stable source"
                )
            source_hashes[path.name] = before
            print(
                json.dumps({"shards": len(source_hashes), "patients": len(guard.patients)}),
                flush=True,
            )
        if set(guard.patients) != set(indexed):
            raise ValueError("Exported patients disagree with source index")
        for row in verifier_rows(verifier, scanner, verifier_guard):
            writers["verifier"].add(row)
        counts = {name: writer.close() for name, writer in writers.items()}
        if sha256(source / "manifest.json") != manifest_hash:
            raise ValueError("Synthetic manifest changed during export")
        if any(sha256(verifier / name) != digest for name, digest in input_hashes.items()):
            raise ValueError("Verifier inputs changed during export")
        overlap = sum(
            patient in guard.patients and guard.patients[patient] != split
            for patient, split in verifier_guard.patients.items()
        )
        card = dataset_card(counts, source_manifest, verifier.name, overlap)
        scanner.check(card, "README.md")
        (temporary / "README.md").write_text(card)
        report = scanner.report()
        write_json(temporary / "scan-report.json", report)
        write_json(destination.parent / "scan-report.json", report)
        files = inventory(temporary)
        release = {
            "kind": "dataset",
            "repoId": "JulianAT/medlyn-synth-v1",
            "syntheticOnly": True,
            "counts": counts,
            "bytes": sum(row["bytes"] for row in files.values()),
            "files": files,
            "sourceManifestSha256": manifest_hash,
            "sourceShards": source_hashes,
            "verifierSource": verifier.name,
            "verifierFiles": input_hashes,
            "crossConfigSplitDifferences": overlap,
            "subset": {"size": subset_size, "seed": 37, "strata": "family, split"},
            "patientSplits": dict(Counter(guard.patients.values())),
        }
        write_json(temporary / "release-manifest.json", release)
        temporary.rename(destination)
        return release
    except Exception:
        report = scanner.report()
        report["status"] = "failed"
        write_json(destination.parent / "scan-report.json", report)
        shutil.rmtree(temporary)
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ML / "data/synth-v1")
    parser.add_argument("--verifier-data", type=Path, default=ML / "verifier/datasets")
    parser.add_argument("--out", type=Path, default=HF / "medlyn-synth-v1")
    parser.add_argument("--expected-patients", type=int, default=100000)
    parser.add_argument("--subset-size", type=int, default=10000)
    parser.add_argument("--shard-size", type=int, default=1000)
    args = parser.parse_args()
    release = export_dataset(
        args.source.resolve(),
        args.verifier_data.resolve(),
        args.out.resolve(),
        ChallengeScanner.from_environment(),
        args.expected_patients,
        args.subset_size,
        args.shard_size,
    )
    print(
        json.dumps(
            {key: release[key] for key in ("counts", "bytes", "crossConfigSplitDifferences")}
        )
    )


if __name__ == "__main__":
    main()
