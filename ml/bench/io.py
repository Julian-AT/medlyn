"""Text-bearing artifacts are restricted to ignored benchmark directories."""

import hashlib
import json
from pathlib import Path

from verifier.common import read_jsonl, write_jsonl

BENCH = Path(__file__).resolve().parent


def digest(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def ignored_directory(path):
    path = Path(path).resolve()
    if not any(path.is_relative_to(BENCH / name) for name in ("results", "cache")):
        raise ValueError("Text artifacts must be under ml/bench/results or ml/bench/cache")
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n")
    temporary.replace(path)


def text_jsonl(path, rows):
    ignored_directory(path.parent)
    write_jsonl(path, rows)


def input_identity(row):
    return digest({"claim": row["claim"], "passages": row["passages"]})


def context(row):
    return "\n".join(
        "\n".join([*p.get("before", []), p["text"], *p.get("after", [])]) for p in row["passages"]
    )


def read(path):
    return list(read_jsonl(path))
