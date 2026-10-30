# Documentation

Start with the [project README](../README.md) to run Medlyn and the
[agent guide](../AGENTS.md) before changing it.

| Document                                            | Read it for                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [PRD v3](PRD.md)                                    | Approved Part A/A+ scope, definitions, acceptance criteria and budget                   |
| [Architecture](architecture.md)                     | Evidence flow, shared validation, chat tools, storage and limitations                   |
| [Decisions](decisions.md)                           | Approved departures from the PRD and superseded choices                                 |
| [Build status](status.md)                           | Checkpoints, measured results, provenance and open integration work                     |
| [ElevenLabs tokens](design/elevenlabs-tokens.md)    | Measured neutral theme and shell geometry; current agent guide governs later icon rules |
| [SEO](seo.md)                                       | Public discovery, origins and patient-app indexing exclusion                            |
| [Search](../packages/engine/search/README.md)       | Extension setup, scoped BM25/vector retrieval and fallback                              |
| [Evaluation](../eval/README.md)                     | Real harness, private output handling and browser requirements                          |
| [Synthetic evaluation](../eval/synthetic/README.md) | Generated challenges, suite controls and separate scores                                |
| [Synthetic corpus](../ml/synth/README.md)           | Generation, labels, materialisation, rewriting and PDF/scan fixtures                    |
| [Verifier](../ml/verifier/README.md)                | Dataset/training/server commands; consult newer results for delivery state              |
| [Verifier dataset](../ml/verifier/DATASET.md)       | Splits, provenance, perturbations and label limitations                                 |
| [Verifier results](../ml/verifier/RESULTS.md)       | Separate method comparisons; automated, not human gold                                  |
| [Paper](../paper/README.md)                         | Build, aggregate provenance and protected held-out handling                             |

The PRD defines intended behavior. Decisions record approved changes; status
records what has been measured. Older lane handoffs and design/SEO verification
sections describe their own snapshots, not the final integrated build. Patient-app
paths in older documents may still say `apps/web`; the final name is `apps/app`.
