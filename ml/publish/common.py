"""Local release paths, root environment loading and artifact identities."""

import hashlib
import json
import os
import shlex
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ML = ROOT / "ml"
HF = ML / "data/hf"


def load_environment():
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        key, separator, value = line.removeprefix("export ").partition("=")
        key = key.strip()
        if not separator or key not in {"HF_TOKEN", "MEDLYN_DATA_PATH"}:
            continue
        tokens = shlex.split(value, comments=True)
        if len(tokens) > 1:
            raise ValueError(f"Invalid root environment value for {key}")
        os.environ.setdefault(key, tokens[0] if tokens else "")


def read_json(path):
    return json.loads(Path(path).read_text())


def read_jsonl(path):
    with Path(path).open() as stream:
        for line in stream:
            if line.strip():
                yield json.loads(line)


def write_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def sha256(path):
    with Path(path).open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inventory(folder):
    result = {}
    for path in sorted(Path(folder).rglob("*")):
        if path.relative_to(folder).parts[:2] == (".cache", "huggingface"):
            continue
        if path.is_symlink():
            raise ValueError("Release folders must not contain symlinks")
        if path.is_file() and path.name != "release-manifest.json":
            result[path.relative_to(folder).as_posix()] = {
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
    return result
