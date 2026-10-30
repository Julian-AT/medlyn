# Verifier results

Status: `measured`.

Machine-measured research results. Rule labels are not human gold.

| Set       | Method          |   n | Macro-F1 | 95% bootstrap CI |         ECE | Mean ms |
| --------- | --------------- | --: | -------: | ---------------- | ----------: | ------: |
| test      | rules_only      | 300 |    0.295 | 0.263 to 0.327   | unavailable |     0.4 |
| test      | local_qlora_raw | 300 |    0.628 | 0.568 to 0.681   |       0.149 |   569.3 |
| test      | local_qlora     | 300 |    0.628 | 0.568 to 0.681   |       0.149 |   569.3 |
| test      | proxy_fast      | 300 |    0.896 | 0.861 to 0.929   | unavailable |  2009.6 |
| test      | cascade         | 300 |    0.857 | 0.811 to 0.899   |       0.092 |  1622.7 |
| rewritten | rules_only      | 300 |    0.295 | 0.263 to 0.328   | unavailable |     0.1 |
| rewritten | local_qlora_raw | 300 |    0.670 | 0.618 to 0.720   |       0.100 |   561.2 |
| rewritten | local_qlora     | 300 |    0.670 | 0.618 to 0.720   |       0.100 |   561.2 |
| rewritten | proxy_fast      | 300 |    0.908 | 0.872 to 0.938   | unavailable |  1998.7 |
| rewritten | cascade         | 300 |    0.884 | 0.847 to 0.917   |       0.091 |  1709.5 |
| real-gold | rules_only      | 100 |    0.301 | 0.278 to 0.319   | unavailable |     0.1 |
| real-gold | local_qlora_raw | 100 |    0.382 | 0.309 to 0.446   |       0.298 |   590.5 |
| real-gold | local_qlora     | 100 |    0.382 | 0.309 to 0.446   |       0.298 |   590.5 |
| real-gold | proxy_fast      | 100 |    0.653 | 0.635 to 0.667   | unavailable |  1812.8 |
| real-gold | cascade         | 100 |    0.609 | 0.574 to 0.638   |       0.547 |  2062.8 |

Macro-F1 averages all three labels, including absent classes. Inspect class supports.
Bootstrap resamples patients; a single-patient set uses claim resampling conditional on that patient, not population uncertainty.
Confidence coverage and reliability bins are in results.json. Missing GPT confidence is unavailable, not zero ECE.
Failures have automatic tags and remain pending human annotation. Text-bearing exports stay in ignored runs/.

| Set                                                                                                         | Projected GPT calls saved | Share saved | Accuracy delta vs GPT |
| ----------------------------------------------------------------------------------------------------------- | ------------------------: | ----------: | --------------------: |
| Offline replay collects both predictions; live application call savings require the regression integration. |
| test                                                                                                        |                       141 |       0.470 |                -0.037 |
| rewritten                                                                                                   |                       125 |       0.417 |                -0.023 |
| real-gold                                                                                                   |                        19 |       0.190 |                -0.110 |

Proxy tariffs and missing historical usage stay null; local energy cost is unmeasured.
No real-regression or deployment-promotion result is implied.
