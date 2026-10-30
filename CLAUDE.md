@AGENTS.md

Use pnpm scripts from the repository root; use uv only from `ml/`.
Never use `--no-verify`, including during integration.
Keep challenge text, secrets, bulk data and model artefacts out of commits.
Use Context7 for current library documentation; report unavailable-tool fallbacks.
Claude plans may live in `~/.claude/plans/`; the current lane brief supersedes old plans.
Lane handoffs and commit manifests go in `/private/tmp/medlyn-<lane>*`.
The integrating orchestrator mirrors reports into `.agents/reports/` and commits.
