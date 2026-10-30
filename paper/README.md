# Paper build and evidence

Run `make -C paper` to generate numeric macros and tables, lint the prose and build
`main.pdf` with Tectonic. Run `make -C paper test` for extraction and manuscript tests.
The build uses the installed `ml/` uv environment without syncing dependencies,
network evaluation, database queries or challenge blind workers.

## Frozen submission evidence

`results/submission-results.json` contains numeric aggregates extracted from the
saved evaluation outputs, manifests, verifier results, quantum report and the
agent-reviewed challenge summary. It records the original input hashes. This small
committed snapshot makes the paper reproducible without private result bundles or
bulk generated data. It contains no patient text, prompts or per-claim predictions.

`results/challenge-review.json` extracts counts and times from `METRICS.md` and the
completed review sheet, retaining both source hashes. Primary cold matrices, repeated
cache failures and older automatic regression runs retain their separate identities.

`scripts/numbers.py` validates the frozen snapshot's committed dependencies and
exports every empirical value through `generated/numbers.tex`. Changed dependencies
fail the build rather than silently inheriting approval. `measurement-review.json`
approves exact numeric values against the complete current input identity. Its reviewer
is the delegated agent, not a clinician; the approval does not create clinician gold.
Unmeasured browser checks, blind relevance and vector-only retrieval are omitted.

To revise a measurement, re-extract it from its source result, update the frozen
snapshot and its dependency hashes, review the generated numeric values, and refresh
`measurement-review.json` using the same reviewer label. Do not hand-edit numbers or
coordinates into the manuscript, generated tables or plots.

The default build excludes challenge blind scores. It never evaluates that set.
Synthetic held-out family scores are a different population from the protected
challenge situations. No combined score is produced.

## Figures and references

TikZ and pgfplots figures read generated numeric macros. Figure 4 shows existing
local/cascade reliability bins and latency versus macro-F1 from the same synthetic
experiment. Cascade confidence covers only locally accepted claims. Saved GPT request
times remain historical, and cascade call savings are offline routing projections.
The quantum appendix reports a completed kernel block, not hardware classifier accuracy.

`reference-verification.json` records primary source URLs for the bibliography.
All bibliography entries are cited. Prose lint rejects dash punctuation and promotional
wording in the manuscript, appendix and figure sources. Tests reject placeholders.

Render every page for visual inspection:

```sh
pdftoppm -scale-to 1400 -png paper/main.pdf /private/tmp/medlyn-final-page
pdftotext paper/main.pdf /private/tmp/medlyn-final-paper.txt
```

Keep rendered pages, TeX intermediate files, private evidence and model artifacts local.
The final PDF is the submission artifact.
