"""Version the verifier's model, adapter and scoring prompt together."""

import hashlib
import json
import os
from pathlib import Path

from .common import SYSTEM, VERIFIER_DIR
from .integrity import file_hash


def model_identity(model, adapters):
    files = {
        name: file_hash(adapters / name)
        for name in ("adapters.safetensors", "adapter_config.json")
        if (adapters / name).exists()
    }
    if "adapters.safetensors" not in files:
        raise FileNotFoundError("Trained adapter is required for verifier identity")
    ref = (
        Path(os.environ.get("HF_HOME", str(VERIFIER_DIR.parent / ".hf")))
        / "hub"
        / ("models--" + model.replace("/", "--"))
        / "refs/main"
    )
    base_revision = ref.read_text().strip() if ref.exists() else None
    identity = {
        "model": model,
        "baseRevision": base_revision,
        "adapterFiles": files,
        "promptSha256": hashlib.sha256(SYSTEM.encode()).hexdigest(),
        "scoring": "label-sequence-sum-v1",
    }
    return "verifier-" + hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
