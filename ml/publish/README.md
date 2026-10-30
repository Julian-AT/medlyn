# Hugging Face release preparation

Run from `ml/` using the installed environment. Only synthetic rows are exported;
the root `.env` supplies `MEDLYN_DATA_PATH` and, for the orchestrator only, `HF_TOKEN`.
Export fails unless all eight challenge documents are available for a complete
120-character overlap scan. No token or challenge text is logged.

```sh
UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync python -m publish.export_dataset
UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync python -m publish.scan_release --folder data/hf/medlyn-synth-v1
UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync python -m publish.export_model
UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync python -m pytest tests/test_publish*.py -q
```

Outputs live under ignored `ml/data/hf/`; exports refuse existing destinations.
The dataset contains `full`, `10k`, and `verifier` configurations with explicit
train/validation/test Parquet paths in its card. The subset is nested in `full`.
Verifier splits are independently family-isolated: do not concatenate configurations
for training/evaluation without first splitting the union by family.

By default the verifier config uses `verifier/datasets`, matching the v1 adapter.
For a completed v2 sweep, export a new dataset release with
`--verifier-data verifier/runs/data-v2 --out data/hf/medlyn-synth-v2-snapshot`
and package the model to a fresh `--out` directory. Keep the verifier config and
selected model's data snapshot matched. Model export chooses the highest validation
macro-F1 among completed, fully covered Qwen3-1.7B sweep runs. If there is no measured
sweep, it selects the completed v1 run by lowest logged validation loss. Rounded
ties choose the latest step. An ineligible measured sweep fails rather than silently
falling back. A 4B model cannot be released under the 1.7B model identity.

Inspect dry runs before the orchestrator uploads:

```sh
UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync python -m publish.upload --repo-type dataset --repo-id JulianAT/medlyn-synth-v1 --folder data/hf/medlyn-synth-v1 --private --dry-run
UV_CACHE_DIR=/private/tmp/medlyn-uv-cache uv run --no-sync python -m publish.upload --repo-type model --repo-id JulianAT/medlyn-verifier-qwen3-1.7b-lora --folder data/hf/medlyn-verifier-qwen3-1.7b-lora --private --dry-run
```

The orchestrator runs those exact commands without `--dry-run` for the final uploads.
The uploader creates private repos, refuses existing public repos, checks the file
allowlist and release hashes, and requires a passed scan. It uses
`upload_large_folder` for datasets where available; installed Hub 2.x instead uses
its resumable, streamed multi-commit `upload_folder` pipeline with `hf_xet`. Models
use `upload_folder`. Interrupted uploads can be resumed with the same command.

Dataset and model cards are generated from exported counts and aggregate evaluation
JSON. Scientific claims still require the project's human review. No real examples,
real prediction files, checkpoint histories, caches or local absolute paths are
copied into the release. Bulk artifacts stay out of the commit plan.

API references (Context7 was unavailable during implementation):

- [Hub upload guide](https://huggingface.co/docs/huggingface_hub/guides/upload)
- [Dataset repository configurations](https://huggingface.co/docs/datasets/repository_structure)
- Installed `huggingface_hub.HfApi` and `mlx_lm/utils.py` APIs
