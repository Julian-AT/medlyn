# QA checklist

Run against `pnpm dev` (port 3000) with Playwright and Chrome. Each pass ends with a screenshot per check.

## Routes (all return 200, no page errors, no hydration warnings)

`/`, `/chats`, `/patient`, `/patient/{medications,diagnoses,labs,imaging,oncology,procedures,allergies,timeline,documents}`, `/situations`, `/open-questions`, `/letter`, `/reviews`, `/research/cohort`, `/research/evaluation`.

## Interactions

| Check                               | 30 Oct, Gate 0 | Notes                                                                          |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------ |
| ⌘K search navigates                 | pass           |                                                                                |
| Situations chip run streams cards   | pass           |                                                                                |
| Source opens a readable passage     | fail           | Sources open in a side slider; replace with popups (Lane A)                    |
| Open questions → Investigate        | fail           | Page is empty until a situation runs; must show patient-wide findings and gaps |
| GP letter generate                  | fail           | Page is empty until a situation runs; must generate without one                |
| Review accept shows confirmation    | pass           |                                                                                |
| Documents reader                    | pass           | Reader to be redesigned as a dialog (Lane A)                                   |
| Patient switcher menu               | unverified     | Selector mismatch in the script; check by hand                                 |
| Chat send from home keeps the draft | pass           | Fixed with a deferred send under Strict Mode                                   |
| Hydration warning on every page     | fixed          | Random sidebar skeleton width replaced                                         |
