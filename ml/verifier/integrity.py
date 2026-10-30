"""Bind frozen inputs and prediction artifacts without depending on MLX."""

import hashlib
import json
from pathlib import Path


def file_hash(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def freeze(data, names=("test", "rewritten")):
    paths = [data / f"{name}.examples.jsonl" for name in names]
    hashes = {path.name: file_hash(path) for path in paths if path.exists()}
    lock = data / "frozen-test.json"
    if lock.exists() and json.loads(lock.read_text()) != hashes:
        raise ValueError("Frozen test changed; use a new dataset directory")
    lock.write_text(json.dumps(hashes, indent=2) + "\n")
    return hashes


def verify_frozen(data):
    lock = data / "frozen-test.json"
    if not lock.exists():
        raise ValueError("Missing frozen-test.json; build v2 data first")
    hashes = json.loads(lock.read_text())
    for name, expected in hashes.items():
        if Path(name).name != name or file_hash(data / name) != expected:
            raise ValueError(f"Frozen test integrity failed: {Path(name).name}")
    return hashes
