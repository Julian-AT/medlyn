# Synthetic German clinical corpus

Run from `ml/` with the installed Python 3.12 environment:

```sh
uv run python -m synth.generate --n 100000 --out data/synth-v1 --workers 8
uv run python -m synth.validate --data data/synth-v1
uv run python -m synth.materialise --data data/sample --patient synth-000000 --out /private/tmp/synth-patient
uv run python -m synth.render_pdf --data data/sample --patient synth-000000 --out /private/tmp/synth-pdf --scan
uv run python -m synth.rewrite --data data/synth-v1 --n 300 --workers 3
uv run python -m pytest tests/test_synth*.py -q
```

From the repository root, `node --experimental-strip-types ml/synth/check-engine.mjs
ml/data/synth-v1` checks every fact against the engine's actual normalisation and segment boundaries,
and runs the engine's `locate` on every hundredth patient. Set the final argument to `1` to run
`locate` for all patients. The same command with `ml/data/sample 1` covers the entire sample.

`generate` refuses to replace an existing dataset. Each worker writes one atomic JSONL shard at a
time. Patient content depends only on the seed and integer patient index, independently of workers
and shard size. Index `line` values start at zero. Offsets use UTF-16 code units into engine-normalised
text, so JavaScript slicing agrees with the labels. `materialise` requires an empty destination and
writes only the challenge-shaped inputs; its labels remain in the dataset.

Each record also includes `history`, `documentationPlan`, and `generation` provenance. The plan
lists the final fact IDs it states and the need IDs it omits. A history-level condition or event is
never sufficient to produce a documented label: facts require rendered evidence. Facts carry
`needIds` as coverage metadata and optional `dueDate`. `segmentId`, `contentHash`, and `f-` IDs follow
the engine's stable-JSON content identity; rewriting refreshes all fact references. Conditions, medication rows, findings, and
lab values are simplified synthetic research examples, without clinical review.

The split is assigned before rendering: indices ending 0–7 train, 8 validation, 9 test. Scenario
families are disjoint across splits. The two final styles and assertion/date-typo mutations occur
only in test. The manifest inventories these holdouts. Medication changes across dated lists are
distractors; dose and schedule contradictions explicitly identify the same single administration
or plan. Gaps describe what the final document set omits, independently of the latent history.

Rewriting sends synthetic sentences only to the configured OpenAI-compatible proxy, reading the
three proxy variables from the repository `.env` without logging them. It makes at most three
concurrent requests, protects tables and all contradiction/distractor passages, checks clinical
attributes, numbers, qualifiers and dates, and re-locates every affected label. A document with a
failed check retains its template. `rewritten` indicates an accepted text change, not an attempted
request. Rewrite provenance and aggregate acceptance counts are stored in the manifest.

Labels are **intended_code_checked**: exact spans, checked tokens, ordered medication schedules,
planned-condition presence, mutation links, and need coverage are checked by code. Neither an
independent semantic annotator nor a human gold review has been run. Do not call this the PRD's
fully verified or gold tier. The engine's extractor is not used as a labeler.

PDF output has selectable text. `--scan` additionally writes image-only PDFs and page PNGs with
seeded slight rotation and sparse noise; all pages are retained. PDF/image offsets differ from
source text offsets. For image evaluation, retain the JSONL record as the label source.
