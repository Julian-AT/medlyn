"""Family-isolated, final-span-checked MedlynBench-synth v1 verifier inputs."""

import json
from collections import Counter, defaultdict

from .build_dataset import (
    balanced,
    chat_row,
    digest,
    family_split,
    patient_examples,
    remove_prompt_overlap,
    source_rows,
)
from .common import Bridge, write_jsonl
from .integrity import freeze


def rewrite_families(sources):
    families = set()
    for source in sources:
        index = source / "index.jsonl"
        if index.exists():
            from .common import read_jsonl

            families.update(
                row["family"]
                for row in read_jsonl(index)
                if row.get("rewritten") and row.get("split") == "test"
            )
    return families


def balanced_rewrites(rows, cap, seed):
    import random

    by_patient = defaultdict(list)
    for row in rows:
        by_patient[row["patientId"]].append(row)
    rng = random.Random(seed)
    selected, seen = [], set()
    for patient_id in sorted(by_patient):
        if len(selected) + 3 > cap:
            break
        trio = []
        reserved = set(seen)
        for label in ("supported", "unsupported", "contradicted"):
            candidates = [row for row in by_patient[patient_id] if row["label"] == label]
            rng.shuffle(candidates)
            for row in candidates:
                key = digest(json.dumps([row["claim"], row["passages"]], sort_keys=True))
                if key not in reserved:
                    trio.append(row)
                    reserved.add(key)
                    break
        if len(trio) == 3:
            selected.extend(trio)
            seen = reserved
    remaining = [
        row
        for row in rows
        if digest(json.dumps([row["claim"], row["passages"]], sort_keys=True)) not in seen
    ]
    selected.extend(balanced(remaining, cap - len(selected), seed))
    rng.shuffle(selected)
    return selected


def build_v2(sources, out, caps=None, seed=37, rewritten_patients=300, dry_run=False):
    caps = caps or {"train": 24000, "valid": 3000, "test": 3000, "rewritten": 900}
    if any(cap < 3 or cap % 3 for cap in caps.values()):
        raise ValueError("Split limits must be positive multiples of three")
    if (out / "frozen-test.json").exists():
        from .integrity import verify_frozen

        verify_frozen(out)
        raise ValueError("Dataset is frozen; choose a new output directory to rebuild")
    reserved = rewrite_families(sources)

    def source_priority(source):
        manifest_path = source / "manifest.json"
        manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        return (not manifest.get("testOnly", False), not bool(rewrite_families([source])))

    sources = sorted(sources, key=source_priority)
    groups = defaultdict(list)
    seen, assignment, snapshots = set(), {}, []
    heldout = set()
    rewritten_seen = set()
    source_identities = []
    with Bridge() as bridge:
        for source in sources:
            path = source / "manifest.json"
            manifest = json.loads(path.read_text()) if path.exists() else {}
            source_identities.append(
                {"name": source.name, "manifestHash": digest(json.dumps(manifest, sort_keys=True))}
            )
            heldout.update(manifest.get("heldOutMutationTypes", []))
            held_families = set(manifest.get("heldOutFamilies", [])) | reserved
            held_parts = set(manifest.get("heldOutStyles", [])) | set(
                manifest.get("heldOutScenarios", [])
            )
            for row, family, declared in source_rows(source):
                patient_id = row["patient"]["id"]
                if patient_id == "patient-0000-0001":
                    raise ValueError("Real-patient data is forbidden in the synthetic builder")
                if patient_id in seen:
                    continue
                rewritten = row.get("generation", {}).get("rewritten", False)
                if rewritten and declared != "test":
                    continue
                if rewritten and len(rewritten_seen) >= rewritten_patients:
                    continue
                split = family_split(family, held_families)
                if declared in ("val", "valid", "validation"):
                    split = "valid"
                if (
                    declared == "test"
                    or family in held_families
                    or held_parts.intersection(family.split(":"))
                ):
                    split = "test"
                # Rewritten families are excluded from both train and validation in their entirety.
                if rewritten:
                    split = "rewritten"
                    rewritten_seen.add(patient_id)
                logical = "test" if split == "rewritten" else split
                if any(
                    meta["family"] == family and meta["split"] != logical
                    for meta in assignment.values()
                ):
                    raise ValueError(f"Generation family crosses splits: {family}")
                seen.add(patient_id)
                if split != "rewritten" and len(groups[split]) >= max(caps[split] * 6, 15000):
                    continue
                prepared = bridge.call(op="patient", row=row)
                assignment[patient_id] = {"family": family, "split": logical}
                snapshots.append({"patientId": patient_id, "prepared": prepared})
                examples = list(patient_examples(row, family, prepared))
                for example in examples:
                    example["mutation"] = {
                        "wrong_passage": "wrong_document_citation",
                        "timing_flip": "temporal_shift",
                    }.get(example["mutation"], example["mutation"])
                    if split not in ("test", "rewritten") and example["mutation"] in heldout:
                        continue
                    groups[split].append(example)
                enough = all(
                    len(groups[name]) >= max(cap * 6, 15000)
                    for name, cap in caps.items()
                    if name != "rewritten"
                )
                if enough and (not reserved or len(rewritten_seen) >= rewritten_patients):
                    break
    # Reserve both test families before balancing, including rewritten text prompts.
    test_groups = {
        "test": groups["test"] + groups["rewritten"],
        "valid": groups["valid"],
        "train": groups["train"],
    }
    overlap = remove_prompt_overlap(test_groups)
    groups.update({name: test_groups[name] for name in ("train", "valid")})
    selected = {name: balanced(groups[name], cap, seed) for name, cap in caps.items()}
    selected["rewritten"] = balanced_rewrites(groups["rewritten"], caps["rewritten"], seed)
    counts = {
        name: {
            "rows": len(rows),
            "patients": len({r["patientId"] for r in rows}),
            "labels": dict(Counter(r["label"] for r in rows)),
            "mutations": dict(Counter(r["mutation"] for r in rows)),
        }
        for name, rows in selected.items()
    }
    for name in ("train", "valid", "test"):
        if len(selected[name]) != caps[name]:
            raise ValueError(
                f"Insufficient balanced {name} examples: {len(selected[name])}/{caps[name]}"
            )
    out.mkdir(parents=True, exist_ok=True)
    for name, rows in selected.items():
        write_jsonl(out / f"{name}.examples.jsonl", rows)
        write_jsonl(out / f"{name}.jsonl", map(chat_row, rows))
    used = {row["patientId"] for rows in selected.values() for row in rows}
    write_jsonl(
        out / "source-snapshots.jsonl", (row for row in snapshots if row["patientId"] in used)
    )
    report = {
        "version": 2,
        "dataset": "MedlynBench-synth v1",
        "seed": seed,
        "dryRun": dry_run,
        "sources": source_identities,
        "splits": counts,
        "assignment": {key: value for key, value in assignment.items() if key in used},
        "heldOutMutationTypes": sorted(heldout),
        "rewrittenPatientsAvailable": len(rewritten_seen),
        "rewrittenPatientsTarget": rewritten_patients,
        "rewrittenStatus": "ready"
        if counts["rewritten"]["patients"] >= rewritten_patients
        else "incomplete; run prepare_rewrites first",
        "exactPromptOverlapRemoved": overlap,
        "labelTier": "rule-constructed + final-span-checked; not human gold",
        "frozenTests": freeze(out),
    }
    (out / "manifest.json").write_text(json.dumps(report, indent=2) + "\n")
    return report
