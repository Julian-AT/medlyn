# Paper build

Run `make -C paper` to generate aggregates, lint the prose and build `main.pdf` with
Tectonic. Run `make -C paper test` for the Python unit tests. The build uses the
existing `ml/` uv environment without installing or syncing dependencies.

The manuscript follows the Lane F section order. Figures are monochrome TikZ and
pgfplots sources under `figures/`. Tables use booktabs. `scripts/lint_prose.py`
rejects em dash punctuation, double and triple hyphen punctuation, and the brief's
prohibited promotional words in `main.tex` and the figure sources. A technical use
of `robust` needs an inline `% prose-lint: allow-robust` comment followed by a
specific explanation of at least twenty characters. Comments and bibliography
page ranges are not manuscript prose.

## Measurements and human review

`scripts/numbers.py` reads allowlisted aggregate fields from regression and browser
JSON outputs, synthetic/retrieval JSON outputs, `ml/verifier/results.json`, the
verifier dataset manifest, and `ml/data/synth-v1/manifest.json`. It never copies
claims, passages, predictions or other free text into generated artifacts.
`generated/numbers.json` contains machine aggregates for review.
`generated/provenance.json` records source paths and SHA-256 hashes.

The manuscript gets every empirical value and plot coordinate from
`generated/numbers.tex`. Missing, invalid and unreviewed values print as
`\textit{pending}`. Pending plot panels contain no measured points or bars.
Protocol constants, such as evaluation targets and retrieval cutoffs, come from
`protocol.json` and are explicitly described as protocol settings.

After checking an aggregate against its sources, a human reviewer can update
`measurement-review.json`:

1. Set `reviewedBy` to the reviewer's name.
2. Copy the complete current path-to-hash mapping from `generated/provenance.json`
   into `sourceHashes`.
3. Add only checked metric names and their exact numeric values from
   `generated/numbers.json` to `metrics`.
4. Rebuild and inspect the PDF.

Every source identity must still match. Any change to a source artifact invalidates
the existing approvals until reviewed again. This conservative rule prevents a
new run from inheriting approval for an old value, including when the rounded
printed value happens to match. Reviewing aggregate counts does not turn
code-checked synthetic labels into human gold.

The build keeps challenge blind results closed. Only the orchestrator may use
`make -C paper NUMBERS_ARGS=--include-heldout` after the scheduled review gate.
Synthetic held-out families and mutation sets are separate from that protected
challenge set. The paper does not run any evaluation or query the shared database.

## Plot schema

Retrieval aggregates use `modes` (or `retrieval.modes`) with `mode` equal to `bm25`,
`vector` or `hybrid`, `status: measured`, positive `evaluated`, and `recallAt5`,
`recallAt10`, `mrrAt10` in the interval from zero to one. A dedicated retrieval
artifact takes precedence over the synthetic suite's embedded aggregate.

Verifier aggregates use `sets.synthetic_heldout_families` and methods `rules_only`,
`proxy_fast`, `local_qlora`, with positive `n`, `macroF1`, `coverage`, and
`latencyMs.p50`. Reliability points additionally require per-method
`calibration.bins` containing `n`, `meanConfidence`, and `accuracy`. No confidence
is invented from class labels. Methods with differing populations must not be
interpreted as a paired comparison.

## References and inspection

`reference-verification.json` records an individual search query and primary URL
for each bibliography entry. Publisher BibTeX is used for ACL entries; tools are
identified as software. The bibliography is cited in the text rather than padded
with uncited entries.

For local visual review, render with:

```sh
pdftoppm -scale-to 1400 -png paper/main.pdf /private/tmp/medlyn-paper-page
```

The PDF, TeX intermediate files and local page images are build artifacts. Keep
source documents, model artifacts and private evaluation evidence out of git.
