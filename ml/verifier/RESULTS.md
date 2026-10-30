# Verifier results

Status: `measured`.

Machine-measured research results. Rule labels are not human gold.

| Set       | Method          |   n | Macro-F1 | 95% bootstrap CI |         ECE | Mean ms |
| --------- | --------------- | --: | -------: | ---------------- | ----------: | ------: |
| test      | rules_only      | 300 |    0.295 | 0.263 to 0.327   | unavailable |     0.4 |
| test      | local_qlora_raw | 300 |    0.764 | 0.713 to 0.813   |       0.128 |   644.3 |
| test      | local_qlora     | 300 |    0.764 | 0.713 to 0.813   |       0.085 |   644.3 |
| test      | proxy_fast      | 300 |    0.896 | 0.861 to 0.929   | unavailable |  2009.6 |
| test      | cascade         | 300 |    0.956 | 0.933 to 0.978   |       0.020 |  1521.9 |
| rewritten | rules_only      | 300 |    0.295 | 0.263 to 0.328   | unavailable |     0.4 |
| rewritten | local_qlora_raw | 300 |    0.842 | 0.801 to 0.881   |       0.075 |   631.3 |
| rewritten | local_qlora     | 300 |    0.842 | 0.801 to 0.881   |       0.027 |   631.3 |
| rewritten | proxy_fast      | 300 |    0.908 | 0.872 to 0.938   | unavailable |  1998.7 |
| rewritten | cascade         | 300 |    0.939 | 0.911 to 0.964   |       0.009 |  1452.7 |
| real-gold | rules_only      | 100 |    0.301 | 0.278 to 0.319   | unavailable |     0.1 |
| real-gold | local_qlora_raw | 100 |    0.421 | 0.352 to 0.483   |       0.215 |   647.2 |
| real-gold | local_qlora     | 100 |    0.421 | 0.352 to 0.483   |       0.144 |   647.2 |
| real-gold | proxy_fast      | 100 |    0.657 | 0.640 to 0.667   | unavailable |  1816.4 |
| real-gold | cascade         | 100 |    0.616 | 0.581 to 0.647   |       0.123 |  1796.6 |

Macro-F1 averages all three labels, including absent classes. Inspect class supports.
Bootstrap resamples patients; a single-patient set uses claim resampling conditional on that patient, not population uncertainty.
Confidence coverage and reliability bins are in results.json. Missing GPT confidence is unavailable, not zero ECE.
Failures have automatic tags and are not independently annotated. Text-bearing exports stay in ignored runs/.

Offline replay collects both predictions; live savings require regression integration.

| Set       | Projected GPT calls saved | Share saved | Accuracy delta vs GPT |
| --------- | ------------------------: | ----------: | --------------------: |
| test      |                       165 |       0.550 |                 0.057 |
| rewritten |                       171 |       0.570 |                 0.030 |
| real-gold |                        38 |       0.380 |                -0.060 |

Proxy tariffs and missing historical usage stay null; local energy cost is unmeasured.
No real-regression or deployment-promotion result is implied.
