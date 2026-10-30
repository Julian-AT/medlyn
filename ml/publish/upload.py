"""Upload a locally scanned release; only the orchestrator executes non-dry-run mode."""

import argparse
import importlib.util
import json
import os
import re
from pathlib import Path

from .common import inventory, load_environment, read_json


def release_files(folder, repo_type):
    if folder.is_symlink():
        raise ValueError("Release folder must not be a symlink")
    manifest = read_json(folder / "release-manifest.json")
    if manifest.get("kind") != repo_type or manifest.get("syntheticOnly") is not True:
        raise ValueError("Expected a synthetic-only release manifest matching repo type")
    files = inventory(folder)
    if files != manifest.get("files"):
        raise ValueError("Release files changed after scanning; re-export before uploading")
    common = {"README.md", "scan-report.json"}
    model = {"adapters.safetensors", "adapter_config.json"}
    for name in files:
        if name in common or (repo_type == "model" and name in model):
            continue
        if repo_type == "dataset" and re.fullmatch(
            r"(?:full|10k|verifier)/(?:train|validation|test)/part-\d{5}\.parquet", name
        ):
            continue
        raise ValueError("Release contains a file outside the publication allowlist")
    if not common.issubset(files) or (repo_type == "model" and not model.issubset(files)):
        raise ValueError("Release is missing required files")
    scan = read_json(folder / "scan-report.json")
    if (
        scan.get("status") != "passed"
        or scan.get("matchCount") != 0
        or scan.get("matches") != []
        or scan.get("referenceDocuments") != 8
        or scan.get("windowCharacters") != 120
        or not scan.get("recordsScanned")
    ):
        raise ValueError("A successful eight-document 120-character scan is required")
    if repo_type == "dataset":
        for config in ("full", "10k", "verifier"):
            for split in ("train", "validation", "test"):
                if not any(name.startswith(f"{config}/{split}/") for name in files):
                    raise ValueError("Dataset is missing a required config/split")
    return [*files, "release-manifest.json"]


def upload(repo_type, repo_id, folder, private=True, dry_run=False):
    if not private:
        raise ValueError("Initial releases must be private")
    if not re.fullmatch(r"JulianAT/[A-Za-z0-9][A-Za-z0-9._-]*", repo_id):
        raise ValueError("Release destination must be a JulianAT repository")
    files = release_files(folder, repo_type)
    summary = {
        "repoType": repo_type,
        "repoId": repo_id,
        "private": True,
        "dryRun": dry_run,
        "files": [{"path": name, "bytes": (folder / name).stat().st_size} for name in files],
        "totalBytes": sum((folder / name).stat().st_size for name in files),
    }
    print(json.dumps(summary, indent=2), flush=True)
    if dry_run:
        return summary
    load_environment()
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise ValueError("HF_TOKEN is required in the root environment")
    from huggingface_hub import HfApi

    api = HfApi(token=token)
    api.create_repo(repo_id=repo_id, repo_type=repo_type, private=True, exist_ok=True)
    if not api.repo_info(repo_id=repo_id, repo_type=repo_type).private:
        raise ValueError("Existing destination is public; choose a private repository")
    kwargs = {
        "repo_id": repo_id,
        "repo_type": repo_type,
        "folder_path": str(folder),
        "allow_patterns": files,
    }
    if repo_type == "dataset" and hasattr(api, "upload_large_folder"):
        api.upload_large_folder(**kwargs, private=True)
    elif repo_type == "dataset":
        # Hub 2.x folds resumable multi-commit large-folder upload into upload_folder with Xet.
        if importlib.util.find_spec("hf_xet") is None:
            raise RuntimeError("Large-folder upload needs hf_xet with this Hub version")
        api.upload_folder(**kwargs, commit_message="Publish scanned synthetic dataset")
    else:
        api.upload_folder(**kwargs, commit_message="Publish validation-selected synthetic verifier")
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-type", choices=("dataset", "model"), required=True)
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--folder", type=Path, required=True)
    parser.add_argument("--private", action="store_true", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.folder.is_symlink():
        raise ValueError("Release folder must not be a symlink")
    upload(args.repo_type, args.repo_id, args.folder.resolve(), args.private, args.dry_run)


if __name__ == "__main__":
    main()
