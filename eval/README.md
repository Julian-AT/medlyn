Run from the repository root:

```sh
EVAL_MOCK=1 pnpm eval
pnpm eval
```

The mock repeats situation 1. Its regression score exercises the harness, not clinical coverage; traceability and grounding are unmeasured. Both commands return a nonzero status when the tested screens fail assertions. `pnpm eval` uses the root `.env`, calls the engine directly, and writes private, gitignored artifacts to `eval/output/`.

To test a deployed endpoint, set `MEDLYN_API_URL` to the full `/api/lens` URL. The provider accepts a `noCache` boolean in its configuration, defaults cold calls to cache bypass, and primes before measuring a confirmed cache hit. `MEDLYN_WEB_URL` selects the cockpit for Playwright (default `http://localhost:3000`). `PLAYWRIGHT_CHANNEL=chrome` selects a system browser; macOS Chrome is detected automatically. `EVAL_CONCURRENCY` defaults to 3. The proxy judge uses `MODEL_REASONING`, `OPENAI_BASE_URL`, and `OPENAI_API_KEY`.

Challenge situations and expected answers load at runtime from `cases/` above `MEDLYN_DATA_PATH`. Nothing from those files is embedded in source. The held-out input set is frozen in `heldout/situations.json`. Its results and logs are written by an isolated worker and never printed. **Do not open `heldout.json`, `heldout.log`, or the held-out section of `summary.md` before the orchestrator authorizes the H+7 review.** Use `regression.json` for regression debugging. `results.json` contains regression, traceability, fresh composed-claim rechecks, finding fixtures and latency; its held-out entry only points to the private file.

The headline recheck invokes the shared validator in a child process with `DATABASE_URL` empty. This forces a fresh semantic verdict without modifying the engine's cache API or cached validations. Source passages reach that child through stdin only. Every lens request omits `sessionId`; Playwright also supplies an empty review overlay without changing the ledger.

Playwright requires `data-lens-state="done"` on the lens canvas, `data-card-id` and `data-need-id` on cards, and `data-claim-id` on card lines. It clicks the five chips, checks the cards named by the regression judge against the returned chip screen, and records cold and warm submit-to-complete times. A running web server with failed browser checks is a failure; an unreachable server is explicitly unmeasured.

Unit checks, using the installed engine Vitest dependency:

```sh
node --env-file=.env packages/engine/node_modules/vitest/vitest.mjs run --root eval --config vitest.config.ts
pnpm --filter @medlyn/eval typecheck
```

`summary.md` is automated judge output. A person must check the real screens before the orchestrator publishes numbers in `METRICS.md`.
