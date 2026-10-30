# Medlyn challenge metrics

**Agent-reviewed (Codex), not clinician-reviewed.** Reviewed 30 October 2026,
10:50–10:52 Europe/Vienna. These figures describe live API screen data, not a
browser visibility certification or clinical validation. See the completed
[review sheet](docs/submission/human-check.md) for question-level checks and failures.

Setup: `http://localhost:3000`; patient `patient-0000-0001`; corpus
`rev-48798dc84d07`; as of 15 April 2016; all eight eligible documents; empty review
session before and after. HEAD was `3f1cc64800e02818bd60dfb85e9f19c5e91a1251`, with
concurrent uncommitted engine/UI changes. This is a working-tree observation,
not a frozen release. Every measure below has the reviewer label and date above.

| Challenge measure   | Agent-reviewed result                                                      | Method and scope                                                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Correct answers     | **15/15 free-text cold; 15/15 chip cold**                                  | Compared all expected components with supported, uncollapsed answering lines in ten reconstructed NDJSON screens. Checked live source passages. Absence required supported absence claims and recorded successful 8/8 coverage. Browser rendering remains unchecked.                                         |
| Traceability        | **100% of 10 sampled fact lines**                                          | Seeded random sample, seed `20261030`; exact UTF-16 quote offsets checked against runtime-normalised documents and live passages. Broader mechanical check: **166/166 cited facts located**, **120/120 passage endpoints HTTP 200** across 25 requests. Does not establish traceability of every UI channel. |
| Invented facts      | **0 unsupported lines found / 167 distinct supported card lines reviewed** | Agent compared claim text, qualifiers, assertion, temporal status and numbers with cited text; included calculated weight change and both operands. Excludes demographics, chat, speech, letters and clinician annotations.                                                                                  |
| Contradictions, net | **5 true − 0 false alarms = 5 net**                                        | C1–C5 matched the PRD. All **29 passages** across C1–C5 and D1–D3 checked; the three clarifications remained separate. Dismissal fixtures absent from the findings list. One cached follow-up card lost its C1 badge despite C1 remaining in findings.                                                       |
| Slowest load        | **10.138 s cold; 0.239 s confirmed cached**                                | Client monotonic POST-to-NDJSON-completion time, including findings/done; ten cold requests and ten confirmed cache hits. API timing, not browser rendering. An additional uncached cache-fill request took **12.943 s**.                                                                                    |

Cold means lens-cache bypass with `noCache: true`; other caches were not cleared.
Warm means the final event explicitly reported `cached: true`. The challenge's
slowest <10 s and PRD cold <5 s targets were missed. All ten confirmed API cache
hits were <1 s; browser cached <1 s remains unmeasured. Cold first-section arrival
was 1.910–5.037 s, missing the <1.5 s target.

The ten primary cold screens passed the answer checks, but the wider run did
**not** pass every gate. One additional emergency request returned 12 unavailable
cards and failed questions 4.1/4.2; its uncached retry recovered in 11.343 s. A
cached chip surgery screen sourced HER2 and Ki-67 only from 12340018 instead of
expected document 12340016: supported content, failed strict expected-source
coverage for those components. A cached free-text follow-up screen lost its
carotid warning. Confirmed cached chip and free-text matrices therefore each
scored **14/15 under those stricter checks**. Do not report all-runs 15/15.

## Existing automated evidence, kept separate

Inspected as automated artefacts on 30 October 2026; no clinician sign-off.
These numbers are from different runs and do not replace the review above.

| Artefact                      | Recorded result                                         | Identity and limitation                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `eval/output/regression.json` | **12/15 answer passes; 3/15 full suite passes**         | Mtime `2026-10-30T09:39:25.522Z`; SHA-256 `6bf3cf36e2a061e48b5be676a1933ae426bb5f5d169d2d1c67c2231176da45c7`; existing availability failures.                                       |
| `eval/output/playwright.json` | **0 expected passes; 5 unexpected failures; 0 skipped** | Started `2026-10-30T09:42:48.706Z`; duration 82.561 s; SHA-256 `2b3a066d4c8c6a24dd904bac2d5774a78d94de74733a300cd87dc98d2edb3f3e`. Does not certify final browser visibility/speed. |
| Real blind held-out           | **Not inspected or run by this lane**                   | No held-out score asserted.                                                                                                                                                         |

Reports mentioning a later automated 15/15 run must retain that run's evidence
identity. The regression file inspected here reports 12/15, not 15/15.

## Separate research evidence

Pointers only; no pooled score or clinician-gold claim:

- Synthetic: [generator documentation](ml/synth/README.md) and local
  `eval/output/synthetic.json`.
- Retrieval: [search documentation](packages/engine/search/README.md) and artefacts
  referenced by [paper provenance](paper/README.md).
- Verifier: [comparison results](ml/verifier/results.md); separate synthetic and
  real-patient test labels; no production promotion decision made here.
- Quantum: [research limitations and provenance](ml/quantum/README.md); separate
  exploratory research, not clinical correctness evidence.

Private captures, source text and scripts remain under
`/private/tmp/medlyn-human-check-20261030/`; they are not publication artefacts.
