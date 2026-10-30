"""Audit frozen verifier spans, class balance, prompt overlap and source isolation on CPU."""

import argparse
import json
from collections import Counter
from pathlib import Path

from .build_dataset import digest, passage_for
from .common import VERIFIER_DIR, read_jsonl
from .integrity import verify_frozen


def audit(data):
    frozen = verify_frozen(data)
    source = {}
    for row in read_jsonl(data / "source-snapshots.jsonl"):
        documents = {doc["id"]: doc for doc in row["prepared"]["documents"]}
        for fact in row["prepared"]["facts"]:
            passage_for(documents[fact["documentId"]], fact)
            source[(row["patientId"], fact["id"])] = fact
    patients, families, prompts = set(), set(), set()
    counts = {}
    manifest = json.loads((data / "manifest.json").read_text())
    heldout = set(manifest["heldOutMutationTypes"])
    for split in ("test", "rewritten", "valid", "train"):
        rows = list(read_jsonl(data / f"{split}.examples.jsonl"))
        current_patients = {row["patientId"] for row in rows}
        current_families = {row["family"] for row in rows}
        current_prompts = {
            digest(json.dumps([row["claim"], row["passages"]], sort_keys=True)) for row in rows
        }
        if patients & current_patients:
            raise ValueError(f"Patient leakage in {split}")
        if split != "rewritten" and families & current_families:
            raise ValueError(f"Family leakage in {split}")
        if split in ("train", "valid") and prompts & current_prompts:
            raise ValueError(f"Prompt leakage in {split}")
        labels = Counter(row["label"] for row in rows)
        if len(set(labels.values())) > 1:
            raise ValueError(f"Unbalanced labels in {split}")
        for row in rows:
            fact = source[(row["patientId"], row["factId"])]
            if (row["documentId"], row["start"], row["end"], row["quoteHash"]) != (
                fact["documentId"],
                fact["start"],
                fact["end"],
                digest(fact["quote"]),
            ):
                raise ValueError(f"Provenance mismatch in {split}")
            if split in ("train", "valid") and row["mutation"] in heldout:
                raise ValueError("Held-out mutation in training or validation")
            if row["mutation"] == "none" and row["claim"] != fact["claim"]:
                raise ValueError("Supported claim differs from final fact")
        patients.update(current_patients)
        families.update(current_families)
        prompts.update(current_prompts)
        counts[split] = len(rows)
    return {"status": "passed", "rows": counts, "frozenTests": frozen}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=VERIFIER_DIR / "runs/data-v2")
    args = parser.parse_args()
    print(json.dumps(audit(args.data)))


if __name__ == "__main__":
    main()
