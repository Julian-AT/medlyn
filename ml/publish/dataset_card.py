"""Generate a dataset card from measured export counts."""

import json


def dataset_card(counts, source, verifier_source, cross_config_overlap):
    size = sum(counts["full"].values())
    category = "100K<n<1M" if size >= 100000 else "10K<n<100K" if size >= 10000 else "1K<n<10K"
    if size < 1000:
        category = "n<1K"
    lines = [
        "---",
        "license: cc-by-4.0",
        "language:",
        "- de",
        "- en",
        "task_categories:",
        "- text-classification",
        "- token-classification",
        "- summarization",
        "size_categories:",
        f"- {category}",
        "pretty_name: Medlyn synthetic clinical corpus v1",
        "tags:",
        "- synthetic",
        "- medical",
        "configs:",
    ]
    for config, splits in counts.items():
        lines += [f"- config_name: {json.dumps(config)}"]
        if config == "full":
            lines += ["  default: true"]
        lines += ["  data_files:"]
        for split in sorted(splits):
            lines += [f"  - split: {split}", f'    path: "{config}/{split}/*.parquet"']
    lines += [
        "---",
        "",
        "# Medlyn synthetic clinical corpus v1",
        "",
        "## Summary",
        "",
        (
            f"{size:,} synthetic patient records, German documents and English fact labels. "
            "No real patients or challenge documents are included. This release is prepared privately first."
        ),
        "",
        "| Config | Train | Validation | Test |",
        "|---|---:|---:|---:|",
    ]
    for config, splits in counts.items():
        lines.append(
            f"| {config} | {splits.get('train', 0)} | {splits.get('validation', 0)} | {splits.get('test', 0)} |"
        )
    lines += [
        "",
        "## Generation pipeline",
        "",
        (
            "Seeded structured histories become documentation plans and fresh German clinical templates. "
            "Controlled mutations change side, dose, date, assertion, BMI arithmetic or schedules. "
            "Labels are derived from final rendered text and mutation ledgers, never Medlyn's extractor. "
            "Bounded LLM prose rewrites retain their source split and must preserve planned values and spans."
        ),
        (
            f"Generator version: `{source.get('generatorVersion', 'unrecorded')}`; seed: "
            f"`{source.get('seed', 'unrecorded')}`; rewritten patients: {source.get('rewrittenPatients', 0)}."
        ),
        "",
        "## Schema",
        "",
        (
            "`full` and `10k`: one row per patient: `id`, `family`, `split`, `documents` (list of structs "
            "with `id`, `title`, `date`, `type`, `department`, `text`), plus JSON string columns "
            "`facts`, `mutations`, `contradictions`, `distractors`, `gaps`. Decode JSON columns with "
            "`json.loads`. Document text retains source `<BR>`/entity formatting. Fact offsets use UTF-16 "
            "code units into engine-normalised text, not raw text or Python character offsets."
        ),
        (
            "`verifier`: one claim/passage example per row: `patient_id`, `family`, `split`, `source`, "
            "`claim`, `label`, `assertion`, `timing`, `mutation`, `document_id`, `fact_id`, `quote_hash`, "
            "`start`, `end`, and JSON string columns `passages` and `messages`. Labels: supported, "
            "unsupported, contradicted. Sources are synthetic only."
        ),
        "",
        "## Splits and leakage control",
        "",
        (
            "Patient and generation-family isolation is checked within each config. The `10k` config "
            "is a deterministic largest-remainder sample stratified by family and split; it retains the "
            "full config's assignments. Subset selection uses SHA-256 ranking with seed 37. "
            "Held-out styles, scenarios and mutations follow the source manifests."
        ),
        (
            f"Verifier input snapshot: `{verifier_source}`. Verifier training has its own pre-augmentation "
            "family assignment. Do not concatenate configs for evaluation: full and verifier configs "
            f"contain {cross_config_overlap} shared patients assigned to different splits. "
            "Use each config independently or re-split the entire union by family before training."
        ),
        (
            "Before writing any text-bearing row, the exporter scans every string against all eight "
            "local challenge documents. The scanner uses the check-data normalisation and rejects every "
            "contiguous 120-character overlap, including unaligned windows. `scan-report.json` records "
            "counts and reference hashes without source text. Real verifier examples and predictions "
            "are never discovered or copied. Release file hashes are in `release-manifest.json`."
        ),
        "",
        "## Label tiers",
        "",
        (
            "These labels are **intended_code_checked**: planned values, final spans and controlled "
            "mutations pass code checks. They are not independently semantically verified or human gold. "
            "Candidate extractor outputs are not truth. The PRD's verified and human-reviewed gold tiers "
            "require additional independent review that this release does not claim."
        ),
        "",
        "## Intended use",
        "",
        (
            "Research on evidence-grounded claim verification, retrieval, contradiction handling and "
            "controlled evaluation. CC BY 4.0 applies to this synthetic release; attribute Medlyn."
        ),
        "",
        "## Limitations",
        "",
        (
            "Synthetic patients and simplified German style templates do not represent real clinical "
            "diversity. English claims and narrow mutation patterns can create shortcuts. Document "
            "rewrites do not establish clinical validity. No clinical review or patient-care validation "
            "is implied. Do not use this corpus to justify autonomous clinical decisions."
        ),
        "",
        "## Citation",
        "",
        "```bibtex",
        "@misc{medlyn_synth_v1,",
        "  author = {Schmidt, Julian},",
        "  title = {Medlyn synthetic clinical corpus v1},",
        "  year = {2026},",
        "  url = {https://huggingface.co/datasets/JulianAT/medlyn-synth-v1}",
        "}",
        "```",
        "",
    ]
    return "\n".join(lines)
