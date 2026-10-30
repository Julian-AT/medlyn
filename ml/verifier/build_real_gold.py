"""Build a test-only real-text rule-labelled set; publish references, never clinical text."""

import argparse
import json
import random
import subprocess
from collections import Counter
from pathlib import Path

from .build_dataset import digest, passage_for, perturbations
from .common import ROOT, VERIFIER_DIR, Bridge, write_jsonl


def real_examples(corpus, limit=100, seed=37):
    documents = {document["id"]: document for document in corpus["documents"]}
    positives, negatives = [], []
    for fact in corpus["facts"]:
        if fact.get("support") != "supported" or fact.get("locationOk") is not True:
            continue
        document = documents[fact["documentId"]]
        passage = passage_for(document, fact)
        segment = next(
            (item for item in document["segments"] if item.get("id") == fact["segmentId"]), None
        )
        if not segment or fact["start"] < segment["start"] or fact["end"] > segment["end"]:
            continue
        base = {
            "patientId": corpus["patientId"],
            "family": "real_patient_rule_test_only",
            "source": "real_test_only",
            "factId": fact["id"],
            "documentId": fact["documentId"],
            "segmentId": fact["segmentId"],
            "start": fact["start"],
            "end": fact["end"],
            "claim": fact["claim"],
            "passages": [passage],
            "labelTier": "located-fact + rule-labelled; human review pending",
            "assertion": fact["assertion"],
            "timing": fact["temporalStatus"],
        }
        positives.append({**base, "label": "supported", "mutation": "none"})
        for mutation, claim in perturbations(fact["claim"], fact):
            if mutation in {"side_flip", "number_change", "dose_change", "assertion_flip"}:
                negatives.append(
                    {**base, "claim": claim, "label": "contradicted", "mutation": mutation}
                )
    rng = random.Random(seed)
    rng.shuffle(positives)
    rng.shuffle(negatives)
    # Round-robin negative families avoids a dose-only transfer set.
    groups = {
        key: [row for row in negatives if row["mutation"] == key]
        for key in sorted({row["mutation"] for row in negatives})
    }
    selected = []
    while len(selected) < limit // 2 and any(groups.values()):
        for values in groups.values():
            if values and len(selected) < limit // 2:
                selected.append(values.pop())
    rows = positives[: limit - len(selected)] + selected
    if len(rows) != limit or len(selected) != limit // 2:
        raise ValueError(
            f"Need {limit // 2} positives and rule negatives; only {len(positives)} / {len(negatives)} candidates"
        )
    rng.shuffle(rows)
    for row in rows:
        row["id"] = (
            "real-"
            + digest(json.dumps([row["factId"], row["mutation"], row["claim"]], sort_keys=True))[
                :16
            ]
        )
    return rows


def export(corpus, out, manifest_path, limit=100):
    # Refuse text-bearing output outside gitignored paths, even if a caller changes --out.
    checked = subprocess.run(
        ["git", "check-ignore", "--quiet", "--no-index", str(out.resolve())], cwd=ROOT, check=False
    )
    if checked.returncode != 0:
        raise ValueError("Real-text output must be gitignored")
    rows = real_examples(corpus, limit)
    out.parent.mkdir(parents=True, exist_ok=True)
    write_jsonl(out, rows)
    manifest = {
        "status": "rule_labelled_human_review_pending",
        "n": len(rows),
        "labels": dict(Counter(row["label"] for row in rows)),
        "mutations": dict(Counter(row["mutation"] for row in rows)),
        "references": [
            {key: row[key] for key in ("id", "factId", "documentId", "segmentId", "start", "end")}
            for row in rows
        ],
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    return {key: value for key, value in manifest.items() if key != "references"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--out", type=Path, default=VERIFIER_DIR / "runs/real/real-gold.examples.jsonl"
    )
    parser.add_argument("--manifest", type=Path, default=VERIFIER_DIR / "real-gold-manifest.json")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.dry_run:
        print(
            json.dumps(
                {
                    "status": "dry_run",
                    "target": 100,
                    "readsPatientData": False,
                    "out": str(args.out),
                }
            )
        )
        return
    with Bridge(env=True) as bridge:
        print(json.dumps(export(bridge.call(op="real-facts"), args.out, args.manifest)))


if __name__ == "__main__":
    main()
