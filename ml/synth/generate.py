import argparse
import json
import os
import time
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import orjson

from . import VERSION
from .catalog import HELD_MUTATIONS, HELD_STYLES, MUTATIONS, SCENARIOS, STYLES
from .render import render_patient
from .validate import validate_patient


def generate_shard(task):
    out, shard_index, start, stop, seed = task
    name = f"shards/part-{shard_index:04d}.jsonl"
    destination = Path(out) / name
    temporary = destination.with_suffix(".tmp")
    index_path = Path(out) / f".index-{shard_index:04d}.jsonl"
    counts, splits, families, mutation_counts = Counter(), Counter(), Counter(), Counter()
    with temporary.open("wb") as stream, index_path.open("wb") as index_stream:
        for line, patient_index in enumerate(range(start, stop)):
            record = render_patient(patient_index, seed)
            counts.update(validate_patient(record))
            generation = record["generation"]
            splits[generation["split"]] += 1
            families[generation["family"]] += 1
            mutation_counts.update(generation["mutationTypes"])
            counts["mutatedPatients"] += bool(generation["mutationTypes"])
            counts["patients"] += 1
            stream.write(orjson.dumps(record) + b"\n")
            index_stream.write(
                orjson.dumps(
                    {
                        "patientId": record["patient"]["id"],
                        "shard": name,
                        "line": line,
                        "family": generation["family"],
                        "split": generation["split"],
                        "rewritten": False,
                        "nDocs": len(record["documents"]),
                    }
                )
                + b"\n"
            )
    temporary.replace(destination)
    return {
        "counts": dict(counts),
        "splits": dict(splits),
        "families": dict(families),
        "mutationCounts": dict(mutation_counts),
    }


def generate(
    n: int,
    out: Path,
    workers: int = 1,
    seed: int = 20261030,
    shard_size: int = 1000,
    start: int = 0,
) -> dict:
    if n < 1 or workers < 1 or shard_size < 1 or start < 0:
        raise ValueError("n, workers and shard_size must be positive; start must be nonnegative")
    if (out / "manifest.json").exists() or list((out / "shards").glob("*.jsonl")):
        raise FileExistsError(f"Refusing to overwrite an existing dataset: {out}")
    began = time.monotonic()
    (out / "shards").mkdir(parents=True, exist_ok=True)
    tasks = [
        (str(out), i, position, min(position + shard_size, start + n), seed)
        for i, position in enumerate(range(start, start + n, shard_size))
    ]
    combined = {key: Counter() for key in ("counts", "splits", "families", "mutationCounts")}
    if workers == 1:
        results = map(generate_shard, tasks)
        for result in results:
            for key, counter in combined.items():
                counter.update(result[key])
    else:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            for done, result in enumerate(pool.map(generate_shard, tasks), 1):
                for key, counter in combined.items():
                    counter.update(result[key])
                print(f"shards {done}/{len(tasks)}", flush=True)
    with (out / "index.jsonl").open("wb") as index:
        for shard_index in range(len(tasks)):
            part = out / f".index-{shard_index:04d}.jsonl"
            index.write(part.read_bytes())
            part.unlink()
    size = sum(file.stat().st_size for file in out.rglob("*.jsonl"))
    manifest = {
        "generatorVersion": VERSION,
        "seed": seed,
        "patientStart": start,
        "nPatients": n,
        **{key: dict(value) for key, value in combined.items()},
        "bytes": size,
        "generationSeconds": round(time.monotonic() - began, 3),
        "workers": workers,
        "shardSize": shard_size,
        "indexLineBase": 0,
        "offsetUnit": "UTF-16 code units",
        "templateInventory": list(STYLES),
        "scenarioInventory": list(SCENARIOS),
        "mutationInventory": list(MUTATIONS),
        "heldOutStyles": list(HELD_STYLES),
        "heldOutMutationTypes": list(HELD_MUTATIONS),
        "heldOutScenarios": list(SCENARIOS[-2:]),
        "labelTier": "intended_code_checked",
        "labelValidation": {
            "failures": 0,
            "checks": [
                "exact_normalised_spans",
                "checked_tokens",
                "ordered_schedules",
                "plan_presence",
                "mutation_passages",
                "gap_coverage",
            ],
        },
        "independentSemanticReview": False,
        "humanGoldReview": False,
        "rewrittenPatients": 0,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(
        description="Generate and code-check a German synthetic corpus."
    )
    parser.add_argument("--n", type=int, default=100_000)
    parser.add_argument("--out", type=Path, default=Path("data/synth-v1"))
    parser.add_argument("--workers", type=int, default=max(1, min(8, (os.cpu_count() or 2) - 2)))
    parser.add_argument("--seed", type=int, default=20261030)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--shard-size", type=int, default=1000)
    args = parser.parse_args()
    print(
        json.dumps(generate(args.n, args.out, args.workers, args.seed, args.shard_size, args.start))
    )


if __name__ == "__main__":
    main()
