"""Independently rescan serialized Parquet releases and refresh their scan certificate."""

import argparse
import json
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import pyarrow.parquet as pq

from .common import inventory, read_json, write_json
from .parquet import LABEL_COLUMNS
from .scan import ChallengeScanner
from .splits import SplitGuard


def scan_file(task):
    path, config, split, documents = task
    scanner = ChallengeScanner(documents, expected_documents=len(documents))
    assignments = []
    try:
        for batch in pq.ParquetFile(path).iter_batches(batch_size=256):
            for row in batch.to_pylist():
                patient = row["patient_id" if config == "verifier" else "id"]
                assignments.append((patient, row["family"], split))
                if row["split"] != split or (config == "verifier" and row["source"] != "synthetic"):
                    raise ValueError("Serialized row has invalid split or source")
                columns = ("passages", "messages") if config == "verifier" else LABEL_COLUMNS
                for column in columns:
                    row[column] = json.loads(row[column])
                scanner.check(row, f"{config}/{split}/{patient}")
    except ValueError as error:
        return {"error": str(error), "report": scanner.report()}
    return {"assignments": assignments, "report": scanner.report()}


def scan_release(folder, scanner, workers=1):
    if not 1 <= workers <= 3:
        raise ValueError("Release scans allow one to three workers")
    release = read_json(folder / "release-manifest.json")
    if release.get("kind") != "dataset" or inventory(folder) != release["files"]:
        raise ValueError("Rescan requires an unchanged dataset release")
    guards = {config: SplitGuard() for config in ("full", "10k", "verifier")}
    counts = {config: {} for config in guards}
    try:
        paths = sorted(folder.glob("*/*/*.parquet"))
        tasks = [(path, *path.relative_to(folder).parts[:2], scanner.documents) for path in paths]
        with ProcessPoolExecutor(max_workers=workers) as pool:
            for path, result in zip(paths, pool.map(scan_file, tasks)):
                report = result["report"]
                scanner.records += report["recordsScanned"]
                scanner.characters += report["charactersScanned"]
                scanner.matches.extend(report["matches"])
                if "error" in result:
                    raise ValueError(result["error"])
                config, split, _ = path.relative_to(folder).parts
                for patient, family, assignment in result["assignments"]:
                    guards[config].add(patient, family, assignment, unique=config != "verifier")
                count = len(result["assignments"])
                counts[config][split] = counts[config].get(split, 0) + count
                print(
                    json.dumps({"scanned": str(path.relative_to(folder)), "rows": count}),
                    flush=True,
                )
        if counts != release["counts"]:
            raise ValueError("Serialized counts disagree with the release manifest")
        scanner.check((folder / "README.md").read_text(), "README.md")
    except Exception:
        report = scanner.report()
        report["status"] = "failed"
        write_json(folder / "scan-report.json", report)
        raise
    report = scanner.report()
    report["scope"] = "Every serialized Parquet row (including nested JSON) and the dataset card"
    write_json(folder / "scan-report.json", report)
    write_json(folder.parent / "scan-report.json", report)
    release["files"] = inventory(folder)
    release["bytes"] = sum(item["bytes"] for item in release["files"].values())
    write_json(folder / "release-manifest.json", release)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--folder", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=3, choices=(1, 2, 3))
    args = parser.parse_args()
    report = scan_release(args.folder.resolve(), ChallengeScanner.from_environment(), args.workers)
    print(json.dumps(report))


if __name__ == "__main__":
    main()
