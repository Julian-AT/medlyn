# Quantum research experiment

Research only; not used in the product. This lane evaluates IBM Qiskit on synthetic data.
It establishes no clinical advantage, quantum speedup or hardware advantage.

## Current measurements

The full **offline control** completed on 400 training and 200 test examples from the
frozen verifier v2 splits, balanced supported versus not supported. Gemini returned HTTP 429:
the shared free-tier daily embedding quota was exhausted. Accordingly, the measured control
uses deterministic 768-dimensional character hashing, **not Gemini embeddings**. Do not
present these measurements as the planned Gemini experiment. Hardware and same-subset
LoRA/GPT predictions are pending. No IBM job has been submitted by this lane.

`results.json` contains the automated, not human-reviewed results, split hashes, subset row
hashes, package versions, model scores and patient-bootstrap confidence intervals. Do not
copy these values into METRICS.md or enable the paper's performance plots before human review.
The three-class verifier's existing pilot results cannot be used as reference rows here.

## Reproduce

Run all commands from `ml/`; dependencies are already installed. Read credentials only from
the repository root `.env`. Nothing in this package reads the real clinical corpus or writes
Neon. Cache, feature arrays and text stay under ignored `ml/data/quantum/`.

```sh
export UV_CACHE_DIR=/private/tmp/medlyn-uv-cache
uv run --no-sync python -m quantum.report --offline-features
uv run --no-sync python -m pytest tests/test_quantum_features.py tests/test_quantum_kernel.py tests/test_quantum_qaoa.py tests/test_quantum_report.py -q
uv run --no-sync ruff check quantum tests/test_quantum_features.py tests/test_quantum_kernel.py tests/test_quantum_qaoa.py tests/test_quantum_report.py
```

After the Gemini daily quota resets, run the planned experiment:

```sh
uv run --no-sync python -m quantum.report
```

This command regenerates features, kernels, baselines, all 15 QAOA runs and figure data.
Before integration, format generated JSON from the repository root with
`pnpm exec biome check --write ml/quantum/results.json ml/quantum/figures/summary.json`.
The embedding cache is keyed by model, dimension, retrieval role, formatting version and text.
It deduplicates inputs and paces at no more than 60 embedding inputs per minute, in batches
of 20. HTTP requests are less frequent. Gemini 2 does not accept `taskType`: passages use
`title: none | text: ...` (RETRIEVAL_DOCUMENT semantics); claims use the documented search
query prefix. There is no silent fallback on network failures. The offline control is an
explicit flag. The shared API quota can still be exceeded by other lanes.

To regenerate only figure data from the saved aggregate report:

```sh
uv run --no-sync python -m quantum.report --reuse
```

`--cached-features` reuses local feature arrays; inspect `features.json` before using it.
It never changes an offline control into a Gemini experiment. A new Gemini run supersedes
local feature arrays. Preserve the prior aggregate report if comparing feature encoders.

## Methods and limits

For every claim/passage pair we concatenate cosine similarity, element-wise product and
absolute difference. PCA fits on training features only; a training-fitted scaler maps eight
components to [0, pi] and clips out-of-range test projections. Patient and generation-family
splits remain disjoint. Unsupported and contradicted collapse into the negative class.
All SVM/logistic models use the same eight features, C=1 and no test-set tuning. Bootstrap
intervals resample patients; they are conditional on the sampled generation families and do
not establish generalisation to unseen clinical writing. Labels are code-checked synthetic
labels, not human gold.

The two-repetition eight-qubit fully connected ZZ map defines a fidelity kernel. The full
400x400 training and 200x400 test/training kernels use `FidelityStatevectorKernel` exact
state overlaps. A separate 16x16 block uses `FidelityQuantumKernel`, `ComputeUncompute` and
`StatevectorSampler` at 4096 shots. This is an explicit efficiency adjustment to the plan:
full finite-shot evaluation of about 160,000 pairs was not performed. Eight-qubit statevector
simulation is easy classically; this is not evidence of quantum computational advantage.
Off-diagonal mean/spread, centered training alignment and minimum eigenvalue are recorded.
Kernel concentration can make unrelated examples nearly indistinguishable. PCA compression
and the feature map may also discard clinically important numbers, sides and negation.

Evidence selection uses five committed synthetic patients, with 8, 9 or 10 candidates each,
k=3, and relevance minus 0.25 times pairwise redundancy. Relevance averages lexical token
coverage and clipped embedding cosine, a research surrogate rather than Medlyn's retrieval
pipeline. `QuadraticProgram` encodes a cardinality penalty exceeding the utility's absolute
range. A hand-checked exhaustive test verifies feasibility and the objective. QAOA uses the
Ising operator's RZ/RZZ phase separator, transverse RX mixer, two seeded COBYLA starts with
100 evaluations each, and ideal Aer statevector expectations. Final Aer SamplerV2 sampling
uses 4096 shots. We report unconditional feasible/optimal probability, expected utility
ratio conditional on feasibility, and best sampled feasible ratio separately. Postselection
must not be mistaken for an unconditional success rate. Exact and greedy runtimes are
included; brute force is practical at this scale. No monotonic improvement with p is assumed.

## IBM hardware runbook (orchestrator only)

Ensure `IBM_QUANTUM_TOKEN` is present in the root `.env`. This lane must not submit jobs.
Use the intended feature encoder first; the hardware script records its identity. A dry run
requires the locally generated feature arrays and neither loads credentials nor connects:

```sh
uv run --no-sync python -m quantum.hardware --dry-run --shots 1024
uv run --no-sync python -m quantum.hardware --shots 1024
```

The live command uses `QiskitRuntimeService(channel="ibm_quantum_platform")`, selects the
least-busy operational non-simulator with at least eight qubits, and transpiles the 136
upper-triangular overlap circuits (including all 16 diagonals) to its ISA. `SamplerV2` uses
1024 shots and `max_execution_time=120`. The limit is a runtime cap, not a guarantee that
136 circuits fit the Open Plan budget. Inspect the dry-run circuit count and account quota
before the orchestrator submits. No optional hardware QAOA is implemented.

A submitted job's backend/id and transpiled depth are saved before waiting. To resume
without resubmission, preserve the same feature arrays and use the same shots:

```sh
uv run --no-sync python -m quantum.hardware --job-id JOB_ID --shots 1024
uv run --no-sync python -m quantum.report --reuse
```

The final aggregate records the symmetric measured matrix, simulator MAE, job timestamps,
queue/execution/wall times and shots. Actual errors, queueing or token absence are not
converted into fabricated measurements. A 16x16 test/test block cannot replace the SVM's
16x400 test/training rows. Therefore held-out hardware SVM accuracy stays null. The optional
16-anchor diagnostic is explicitly **training resubstitution**, never held-out accuracy.
A valid held-out classifier comparison requires a separately authorised larger cross-kernel
hardware budget.

## Integration

- Mount `<QuantumCard />` from `apps/web/components/research/quantum-card.tsx` on Research /
  Evaluation. It reads only the compact aggregate summary and labels feature provenance.
- After the bibliography, add `\input{appendix-quantum}` in `paper/main.tex` (the orchestrator
  owns that file). Main already loads `figures/styles.tex`. The appendix defaults to protocol
  and pending-review text; a human reviewer may define `\MedlynQuantumReviewed` to enable
  measured plots. Do not define it automatically.
- Add one root README Research line: “Exploratory IBM Qiskit quantum kernels and QAOA on
  synthetic examples; offline control measured, Gemini/hardware pending; no product use.”
- Figure sources use the shared rounded pastel style. `figures/*.dat` under this package
  contain only aggregate scores/matrices, no claim or passage text.

Official references checked during implementation:
[Gemini 2 task prefixes](https://ai.google.dev/gemini-api/docs/embeddings#task-types-with-embeddings-2),
[Qiskit Machine Learning source](https://github.com/qiskit-community/qiskit-machine-learning),
[IBM Runtime source](https://github.com/Qiskit/qiskit-ibm-runtime),
[Qiskit Optimization source](https://github.com/qiskit-community/qiskit-optimization).
Context7 tools were unavailable; installed 2.6/V2 source and official docs were used instead.
