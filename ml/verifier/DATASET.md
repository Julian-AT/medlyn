# MedlynBench-synth v1 dataset card

Version: verifier builder v2, seed 37. Task: classify an English claim against located German
passages as supported, unsupported or contradicted; assertion and timing are training sublabels.

## Composition and provenance

The local frozen `verifier/runs/data-v2-final` manifest contains 24,000 training, 3,000 validation and 3,000 test
examples, balanced equally across the three labels. Source patients come from the independently
rendered synth-v1 corpus. Generator labels and mutation ledgers supply truth; the Medlyn extractor
does not label this benchmark. Quotes are checked against final normalised document text using
UTF-16 offsets and actual engine segmentation. English claims use the engine's fact templates.

The manifest records source hashes, patients, generation families, mutation counts, assignments,
label tier and frozen test hashes. Prepared source snapshots are local and frozen alongside inputs.
`audit_dataset` checks all selected spans, source identities and split boundaries. No challenge
text is present in synthetic templates or training inputs.

## Splits and mutations

Patient and generation-family assignments precede mutation and rewriting. Source-declared
validation/test assignments and held-out styles/scenarios/families are respected. Exact prompts
are reserved for test before validation and training. The current source holds assertion flips
and typo dates out of train and validation. Other negatives include same-kind number swaps,
precise numeric/dose changes, side flips, negation scope, temporal shifts and wrong-document
citations. Unsupported additions remain in the distribution; the model may learn their shortcut.

The separate rewritten-prose test family contains 900 examples from 234 eligible
patients in the frozen manifest, below its 300-patient target. This population is
distinct from the main corpus's cross-split rewrite count. The saved comparison samples
bounded subsets; its method denominators are in [results.json](results.json). Rewritten
patient documents can retain template spans, so this is not wholly free-form prose transfer.

Frozen test hashes are recorded in `results.json.evaluationIdentity.frozenTests`.
Test files are immutable once their freeze record exists. New builds use a new output
directory instead of replacing a published test file.

## Real-text transfer set

`real-gold-manifest.json` records 100 claims: 50 positives from located facts with supported ingest
verdicts and 50 side/number/negation rule negatives. Real text exists only in ignored
`verifier/runs/real/real-gold.examples.jsonl`. Public metadata contains counts, opaque ids and source
UTF-16 offsets. Source corpus revision must match the database; eligibility comes exclusively from
`store.evidenceWindow`. No review overlay is used.

These are **rule labels without independent clinician annotation**. Positives inherit the engine judge's support
verdict and are not independent semantic gold. The set has two classes and one patient: macro-F1
still averages all three classes (ceiling 2/3 for a perfect prediction). Claim bootstrap intervals
are conditional on this patient and do not estimate transfer to other patients. The older cached
letter set is separately reported as weak labels; it is never pooled with this set.

## Limitations and access

Synthetic German styles, fixed English templates and artificial negatives differ from clinical
practice. Rule-checked spans do not establish semantic correctness. Label noise, shortcuts,
correlated claims and unrepresented institutions can inflate scores. No clinical efficacy or
population generalisation claim is supported. Bulk data, source text, predictions, adapters and
failure exports stay local and ignored; this card releases metadata and reproducible code only.
