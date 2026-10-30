# Medlyn technical paper

Run from the repository root:

```sh
make -C paper
make -C paper test
```

The build runs `uv run --no-sync python ../paper/scripts/numbers.py` from `ml/`, then
`tectonic --keep-logs main.tex`. It uses the installed Python environment without changing
dependencies. Tectonic downloads missing TeX resources on its first run. Both tool caches
default to writable task directories under `/private/tmp`; override `UV_CACHE_DIR` or
`TECTONIC_CACHE_DIR` if needed. The output is `paper/main.pdf`, intentionally not ignored.
The integrating orchestrator stages and commits it with the LaTeX sources.

`main.tex` uses an original single-column `arxiv.sty`, natbib references and a TikZ diagram.
Every experimental number comes from generated macros. Protocol targets are explicitly
identified in `protocol.json`, separately from measurements. Missing inputs become
`\textit{pending}`; they never become zero. `generated/provenance.json` records source
hashes. Generated files contain aggregate metrics only, never source passages or judge text.

The complete `eval/output/results.json` bundle takes precedence over a standalone
`regression.json`, which may belong to a newer, incomplete run. Their rows and audit metadata
are never mixed. Mock reports are excluded. A warm request counts as cached only when its
cache flag confirms that. A failed browser launch leaves visibility pending. Ingestion
counts fall back to the prior ingest lane summary if structured summaries are missing;
that provenance is recorded and the paper explicitly describes it as a prior run.

The generator reads the full synthetic manifest and separate sample manifest, verifier
dataset/results, and synthetic evaluation aggregates including retrieval baselines. A
generated challenge count is distinct from the number executed. Verifier comparisons
use the `synthetic_heldout_families` set, with missing/empty methods pending. All results
remain automated observations requiring human review.

Protected challenge held-out scores are **not opened by default**. Only after the H+7
checkpoint authorizes review, rebuild with:

```sh
make -C paper NUMBERS_ARGS=--include-heldout
```

The bibliography was checked against arXiv abstract pages, ACL Anthology, original papers
and official software repositories. Verification URLs are recorded in
`reference-verification.json`. No references were invented for unmeasured research.
