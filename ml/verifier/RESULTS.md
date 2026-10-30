# Verifier results

Status: `pilot_v1_predictions_reanalysed_no_retraining`.

Machine-measured research results. Rule labels are not human gold.

| Set                        | Method      |   n | Macro-F1 | 95% bootstrap CI |         ECE | Mean ms |
| -------------------------- | ----------- | --: | -------: | ---------------- | ----------: | ------: |
| synthetic_heldout_families | rules_only  |  90 |    0.287 | 0.230 to 0.336   | unavailable |     0.1 |
| synthetic_heldout_families | local_qlora |  90 |    0.754 | 0.670 to 0.828   |       0.191 |   576.6 |
| synthetic_heldout_families | proxy_fast  |  90 |    0.898 | 0.829 to 0.955   | unavailable |  2026.7 |
| heldout_mutation_types     | rules_only  |  14 |    0.000 | 0.000 to 0.000   | unavailable |     0.1 |
| heldout_mutation_types     | local_qlora |  14 |    0.175 | 0.083 to 0.259   |       0.549 |   573.2 |
| heldout_mutation_types     | proxy_fast  |  14 |    0.242 | 0.143 to 0.296   | unavailable |  1471.4 |
| real_patient_weak_labels   | rules_only  |  30 |    0.259 | 0.212 to 0.296   | unavailable |     0.2 |
| real_patient_weak_labels   | local_qlora |  30 |    0.222 | 0.167 to 0.267   |       0.288 |   520.0 |
| real_patient_weak_labels   | proxy_fast  |  30 |    0.333 | 0.333 to 0.333   | unavailable |  1894.0 |

Macro-F1 averages all three labels, including absent classes. Inspect class supports.
Bootstrap resamples patients; a single-patient set uses claim resampling conditional on that patient, not population uncertainty.
Confidence coverage and reliability bins are in results.json. Missing GPT confidence is unavailable, not zero ECE.
Failures have automatic tags and remain pending human annotation. Text-bearing exports stay in ignored runs/.

V2 training: pending GPU-enabled orchestrator run.
Cascade: unmeasured; no validation policy fitted.

Proxy tariffs and missing historical usage stay null; local energy cost is unmeasured.
No real-regression or deployment-promotion result is implied.
