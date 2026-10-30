"""Copy 300 already held-out patients before invoking the bounded prose rewriter."""

import argparse
import json
from pathlib import Path

from .build_dataset import family_split, source_rows
from .common import ROOT, VERIFIER_DIR, write_jsonl
from .evaluate import load_env


def prepare(source, out, count=300, dry_run=False):
    if (out / "manifest.json").exists():
        raise ValueError("Rewrite source already exists; choose a new directory")
    manifest = json.loads((source / "manifest.json").read_text())
    held = set(manifest.get("heldOutFamilies", []))
    rows = []
    for row, family, declared in source_rows(source):
        if declared != "test" and family_split(family, held) != "test":
            continue
        if row.get("generation", {}).get("rewritten"):
            continue
        rows.append((row, family))
        if len(rows) == count:
            break
    if len(rows) != count:
        raise ValueError("Not enough untouched test patients for rewriting")
    (out / "shards").mkdir(parents=True)
    write_jsonl(out / "shards/part-0000.jsonl", (row for row, _ in rows))
    write_jsonl(
        out / "index.jsonl",
        (
            {
                "patientId": row["patient"]["id"],
                "family": family,
                "split": "test",
                "rewritten": False,
                "shard": "shards/part-0000.jsonl",
                "line": i,
            }
            for i, (row, family) in enumerate(rows)
        ),
    )
    copied_manifest = {
        key: manifest[key]
        for key in (
            "generatorVersion",
            "seed",
            "heldOutFamilies",
            "heldOutStyles",
            "heldOutScenarios",
            "heldOutMutationTypes",
        )
        if key in manifest
    }
    copied_manifest.update(
        nPatients=count,
        counts={
            "patients": count,
            "documents": sum(len(row["documents"]) for row, _ in rows),
            "facts": sum(len(row["labels"]["facts"]) for row, _ in rows),
        },
        rewrittenPatients=0,
        rewriteSource=source.name,
        testOnly=True,
        dryRun=dry_run,
    )
    (out / "manifest.json").write_text(json.dumps(copied_manifest, indent=2))
    if dry_run:
        return {"status": "prepared_only", "patients": count}
    from synth.rewrite import rewrite_dataset

    load_env()
    return rewrite_dataset(out, count, workers=3)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "ml/data/synth-v1")
    parser.add_argument("--out", type=Path, default=VERIFIER_DIR / "runs/rewritten-source")
    parser.add_argument("--count", type=int, default=300)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.count <= 300:
        parser.error("count must be between 1 and 300")
    print(json.dumps(prepare(args.source, args.out, args.count, args.dry_run)))


if __name__ == "__main__":
    main()
