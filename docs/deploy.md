# Deploy Medlyn to Vercel

Two public Vercel projects serve this workspace: the landing page on `medlyn.health` and
the patient app on `app.medlyn.health`. The app has no demo password (user decision, see
`docs/decisions.md`); it sends `noindex` and `X-Robots-Tag`. A Next.js 16 `proxy.ts`
refuses to serve production traffic when mock data, the local verifier or a non-OpenAI
model endpoint is configured. All database API routes export `runtime = "nodejs"`.

| Project name | Root Directory | Domain              | Workspace filter |
| ------------ | -------------- | ------------------- | ---------------- |
| `medlyn-www` | `apps/www`     | `medlyn.health`     | `@medlyn/www`    |
| `medlyn-app` | `apps/app`     | `app.medlyn.health` | `@medlyn/app`    |

Use Node.js **24.x** in both projects' Build and Deployment settings. Enable
**Include source files outside of the Root Directory in the Build Step**, so the
engine and workspace configuration are available. Keep the default `.next` output
directory. Each app's `vercel.json` installs at the workspace root using
`pnpm install --frozen-lockfile` and runs its filtered Turbo build. The patient app uses the `@medlyn/app` build filter.
See Vercel's [monorepo settings](https://vercel.com/docs/monorepos/monorepo-faq).

## Before deploying

Ingest and warm the chosen Neon database locally. Deployment never ingests files.
The evidence reader uses stored documents and segments and propagates database
failures; it has no local corpus fallback. Runtime trace exclusions keep challenge
files, local datasets, archives and `.env` files out of functions. Research APIs serve the committed `apps/app/data/research-snapshot.json` in production.
Regenerate it before deployment with `node scripts/research-snapshot.mjs`. The builder
uses committed verifier/quantum results and synthetic samples, optional local aggregate
reports and the documented METRICS.md observations. Source hashes travel with the
snapshot; real captures, source passages, blind results and local paths are excluded.
The builder runs the challenge-text scan before returning successfully. Local APIs use
live files when present and fall back to the snapshot when a report is missing.

The root `.vercelignore` excludes local evidence, datasets, model artifacts,
private reports and build outputs. Keep it in place for every CLI deployment;
its minimum exclusions include the following.
[Vercel uploads source files unless excluded](https://vercel.com/docs/deployments/vercel-ignore);
Next.js tracing exclusions only control the function bundle.

```gitignore
.env*
**/.env*
TRACK-1-*/
data/
ml/data/
ml/models/
ml/adapters/
**/*.safetensors
**/*.gguf
**/*.zip
**/*.sql
```

Prefer deploying an integrated, clean checkout containing only reviewed source
files. Do not upload the active shared hackathon tree without reviewing upload exclusions. Existing project-level `.vercelignore` files take precedence
over the root file and must carry the same exclusions.

Both `/api/chat` and `/api/lens` export a 60-second `maxDuration`, matching
the API default in the app's Vercel configuration. Lens failures return an
unavailable response with status `503`. See
[function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

## Production environment

Fill the root `.env`, using `.env.example` as the inventory. Never create package
`.env` files. For deployment, supply:

- `OPENAI_API_KEY_PROD`: a direct OpenAI key. The helper maps it to
  `OPENAI_API_KEY` and fixes `OPENAI_BASE_URL=https://api.openai.com/v1`.
- `MODEL_FAST_PROD` and `MODEL_REASONING_PROD`: OpenAI model IDs selected at
  deployment time. If unset, the helper uses `MODEL_FAST` and `MODEL_REASONING`;
  verify those are direct OpenAI IDs rather than local proxy aliases.
- `DATABASE_URL_DEMO` for the frozen demo database, or `DATABASE_URL` otherwise.
- `NEXT_PUBLIC_SITE_URL=https://medlyn.health` and
  `NEXT_PUBLIC_APP_URL=https://app.medlyn.health`. Both must be set **before
  building** so metadata and cross-app links use the deployed origins.

Optional app variables are `GEMINI_API_KEY`, `GEMINI_EMBED_REQUESTS_PER_MINUTE`,
`MEDLYN_LLM_CONCURRENCY`, and the pair `FISH_AUDIO_API_KEY` / `FISH_AUDIO_VOICE_ID`.
The helper pins `MEDLYN_MOCK=0` and `MEDLYN_VERIFIER=gpt`; the local MLX service
is never a production dependency. It never sends `MEDLYN_DATA_PATH`, local paths,
the proxy key, IBM credentials or research settings. The landing project receives
only the two public origins. Remove obsolete manually configured variables from
existing projects; the helper adds or replaces planned variables and does not
delete other settings.

## Link, configure and deploy

Run these commands from the repository root with an authenticated `vercel` CLI
already on `PATH`. Choose the correct account/team during each link. The `--apply`
mode sends secret values through stdin, suppresses CLI output, and uses
[`vercel env add … production --force`](https://vercel.com/docs/cli/env).
Without `--apply`, it only prints a masked plan. The helper refuses to apply if a
required value or project link is missing.

```sh
vercel login

MEDLYN_APP_DIR=apps/app

vercel link --cwd apps/www --project medlyn-www
vercel link --cwd "$MEDLYN_APP_DIR" --project medlyn-app

# Confirm each project's Root Directory and Node 24.x in the dashboard.
vercel project inspect medlyn-www
vercel project inspect medlyn-app

node scripts/vercel-env.mjs --project www
node scripts/vercel-env.mjs --project app --app-dir "$MEDLYN_APP_DIR"
node scripts/vercel-env.mjs --project www --apply
node scripts/vercel-env.mjs --project app --app-dir "$MEDLYN_APP_DIR" --apply

# Deploy from the workspace root; select the linked projects explicitly.
vercel deploy --prod --project medlyn-www
vercel deploy --prod --project medlyn-app

vercel domains add medlyn.health medlyn-www
vercel domains add www.medlyn.health medlyn-www
vercel domains add app.medlyn.health medlyn-app
```

For CLI versions without the global `--project` flag, read `orgId` and `projectId`
from each app's `.vercel/project.json`, export them as `VERCEL_ORG_ID` and
`VERCEL_PROJECT_ID`, and run `vercel deploy --prod` from the workspace root for
each project. This includes the workspace sources and avoids app-directory path
duplication. [Vercel documents explicit project selection for monorepos](https://vercel.com/docs/monorepos/monorepo-faq).

Use `fra1` for both projects: the configured Neon host was checked without printing
credentials and contains `eu-central-1`. Recheck the region if the deployment
database changes. Do not set an Edge runtime for Neon routes.

## Registrar DNS

Create these records in the DNS zone for `medlyn.health` at Spaceship:

| Type  | Name  | Target                 |
| ----- | ----- | ---------------------- |
| A     | `@`   | `76.76.21.21`          |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `app` | `cname.vercel-dns.com` |

Remove conflicting records for the same names. If Vercel supplies a project-specific
CNAME target or an ownership TXT challenge, use the values shown by
`vercel domains inspect <domain>`. Confirm both domains after DNS propagates:

```sh
vercel domains inspect medlyn.health
vercel domains inspect app.medlyn.health
```

## Verify the deployment

```sh
curl -I https://medlyn.health
curl -I https://app.medlyn.health/patient
curl -i https://app.medlyn.health/api/patient/list
curl -i -X POST https://app.medlyn.health/api/lens
curl -i -X POST https://app.medlyn.health/api/chat
```

Expect public landing and patient pages. Production returns `503` when the
service guard detects mock data, a local verifier or a non-OpenAI endpoint.
Research endpoints return the bundled aggregate snapshot without local files.
Exercise one situation, a source link,
chat and a letter against the ingested database; no deployed model call was made
by this lane's dummy-value build checks.

For concurrent local build verification, run Next directly with
`MEDLYN_NEXT_DIST_DIR=.next-deploy-prep` to isolate this lane's app output from
other agents' `.next` builds. Do not set this variable on Vercel. Delete only that
lane-owned build directory after checking it. Run the app tests with:

```sh
pnpm --dir packages/engine exec vitest run --root ../../apps/app
```
