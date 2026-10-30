"""Freeze benchmark populations before inference, including public strata."""

import json
import random
from collections import defaultdict

from verifier.common import LABELS
from verifier.evaluate import input_hash
from verifier.integrity import file_hash, verify_frozen

from .english import existing_translation
from .io import digest, input_identity, read, text_jsonl, write_json


def stratified(rows, limit, seed=37):
    groups = defaultdict(list)
    for row in rows:
        groups[(row.get("publicDataset", ""), row["label"])].append(row)
    rng = random.Random(seed)
    for group in groups.values():
        rng.shuffle(group)
    selected = []
    keys = sorted(groups)
    while len(selected) < limit and any(groups.values()):
        for key in keys:
            if groups[key] and len(selected) < limit:
                selected.append(groups[key].pop())
    rng.shuffle(selected)
    return selected


def validate(rows):
    seen = set()
    for row in rows:
        if (
            row.get("label") not in LABELS
            or not isinstance(row.get("claim"), str)
            or not row["claim"].strip()
        ):
            raise ValueError("Invalid benchmark row")
        if not row.get("passages") or any(not p.get("text") for p in row["passages"]):
            raise ValueError("Missing benchmark passages")
        key = input_identity(row)
        if key in seen:
            raise ValueError("Duplicate benchmark input")
        seen.add(key)
    return rows


def assert_disjoint(test, development):
    for key in ("patientId", "family"):
        left = {r[key] for r in test if r.get(key)}
        right = {r[key] for r in development if r.get(key)}
        if left & right:
            raise ValueError(f"Test/development {key} overlap")
    if {input_identity(r) for r in test} & {input_identity(r) for r in development}:
        raise ValueError("Test/development prompt overlap")


def public_rows(records, limit=500):
    rows = []
    for row in records:
        if row["label"] not in (0, 1):
            raise ValueError("Unknown LLM-AggreFact label")
        rows.append(
            {
                "claim": row["claim"],
                "passages": [{"text": row["doc"], "section": None, "before": [], "after": []}],
                "label": "supported" if row["label"] == 1 else "unsupported",
                "mutation": "public_unmodified",
                "publicDataset": row["dataset"],
                "documentHash": digest(row["doc"]),
                "labelTier": "public_human_annotated_binary",
                "language": "en",
            }
        )
    unique = {input_identity(r): r for r in rows}
    selected = stratified(list(unique.values()), limit)
    if len(selected) != limit:
        raise ValueError("Insufficient unique public examples")
    return selected


def prepare(data, out, limit=300, real=None, public=False, public_revision="main"):
    if limit < 3:
        raise ValueError("Suite limit must be at least three")
    frozen = verify_frozen(data)
    manifest = json.loads((data / "manifest.json").read_text())
    if manifest.get("dryRun"):
        raise ValueError("Cannot benchmark dry-run training data")
    test = validate(read(data / "test.examples.jsonl"))
    development = read(data / "train.examples.jsonl") + read(data / "valid.examples.jsonl")
    rewritten_path = data / "rewritten.examples.jsonl"
    rewritten = validate(read(rewritten_path)) if rewritten_path.exists() else []
    assert_disjoint(test + rewritten, development)
    held = set(manifest.get("heldOutMutationTypes", []))
    if any(r.get("mutation") in held for r in development):
        raise ValueError("Held-out mutation appears in development data")
    suites = {
        "synthetic-families": stratified(test, limit),
        "heldout-mutations": stratified([r for r in test if r.get("mutation") in held], limit),
        "rewritten-prose": stratified(rewritten, limit),
    }
    statuses = {}
    real_status = "not provided"
    if real and real.exists():
        suites["real-text"] = validate(read(real))
        real_status = "human_review_pending"
        statuses["real-text"] = {
            "status": "ready",
            "target": 100,
            "actual": len(suites["real-text"]),
            "goldStatus": real_status,
        }
    if public:
        try:
            from datasets import load_dataset

            dataset = load_dataset("lytang/LLM-AggreFact", split="test", revision=public_revision)
            suites["aggrefact"] = public_rows(dataset)
            statuses["aggrefact"] = {
                "status": "ready",
                "fingerprint": dataset._fingerprint,
                "revision": public_revision,
            }
        except (ImportError, OSError, RuntimeError, ValueError) as error:
            statuses["aggrefact"] = {
                "status": "skipped",
                "reason": type(error).__name__,
                "note": "Requires installed datasets and accepted HF dataset access",
            }
    else:
        statuses["aggrefact"] = {"status": "not_requested"}
    for name, rows in list(suites.items()):
        if name == "aggrefact":
            continue
        translated = [value for row in rows if (value := existing_translation(row)) is not None]
        if translated:
            suites[name + "-existing-english"] = translated
            statuses[name + "-existing-english"] = {
                "status": "ready",
                "condition": "existing_english_translation",
                "translationCoverage": len(translated) / len(rows),
            }
    identities = {}
    for name, rows in suites.items():
        validate(rows)
        for row in rows:
            row["legacyInputHash"] = input_hash(row)
        text_jsonl(out / f"{name}.jsonl", rows)
        identities[name] = {
            "sha256": file_hash(out / f"{name}.jsonl"),
            "n": len(rows),
            "binaryOnly": name == "aggrefact",
            "labelTier": real_status
            if name.startswith("real-text")
            else "public_human_binary"
            if name == "aggrefact"
            else "rule_constructed_not_human_gold",
        }
        statuses.setdefault(name, {"status": "ready" if rows else "unavailable_empty"})
    lock = {
        "version": 1,
        "seed": 37,
        "sourceFrozen": frozen,
        "dataManifestHash": file_hash(data / "manifest.json"),
        "developmentHashes": {
            name: file_hash(data / f"{name}.examples.jsonl") for name in ("train", "valid")
        },
        "heldOutMutationTypes": sorted(held),
        "suiteStatus": statuses,
        "suites": identities,
    }
    write_json(out / "suites.json", lock)
    return lock


def load_suites(out):
    manifest = json.loads((out / "suites.json").read_text())
    suites = {}
    for name, meta in manifest["suites"].items():
        path = out / f"{name}.jsonl"
        if file_hash(path) != meta["sha256"]:
            raise ValueError("Frozen benchmark suite changed")
        suites[name] = validate(read(path))
    return manifest, suites
