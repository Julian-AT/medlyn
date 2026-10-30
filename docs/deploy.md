# Deploy Medlyn to Vercel

Two Vercel projects serve this workspace. The landing page is public; the patient
app requires a signed demo session for pages and APIs. The proxy follows the
[Next.js 16 `proxy.ts` convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
and runs on Node.js. All existing database API routes export `runtime = "nodejs"`.
Local development remains open when demo authentication is unconfigured;
production always fails closed.

| Project name | Root Directory                             | Domain                     | Workspace filter |
| ------------ | ------------------------------------------ | -------------------------- | ---------------- |
| `medlyn-www` | `apps/www`                                 | `aim.julianschmidt.cv`     | `@medlyn/www`    |
| `medlyn-app` | `apps/web` (or `apps/app` after the sweep) | `app.aim.julianschmidt.cv` | `@medlyn/web`    |

Use Node.js **24.x** in both projects' Build and Deployment settings. Enable
**Include source files outside of the Root Directory in the Build Step**, so the
engine and workspace configuration are available. Keep the default `.next` output
directory. Each app's `vercel.json` installs at the workspace root using
`pnpm install --frozen-lockfile` and runs its filtered Turbo build. The app's
directory name can change without changing the package filter; if its package
name also changes, update the app's `vercel.json` build filter in the same sweep.
See Vercel's [monorepo settings](https://vercel.com/docs/monorepos/monorepo-faq).

## Before deploying

Ingest and warm the chosen Neon database locally. Deployment never ingests files.
The evidence reader uses stored documents and segments and propagates database
failures; it has no local corpus fallback. Runtime trace exclusions keep challenge
files, local datasets, archives and `.env` files out of functions. Research APIs
are disabled in production because their reports currently live on disk.

Before any CLI deployment, the orchestrator must add a root `.vercelignore` (outside
this lane's ownership) excluding at least the following. Also exclude local saved
reference pages, screenshots, dumps and other private files in this working tree.
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
files. Do not upload the active shared hackathon tree before upload exclusions
have been integrated. Existing project-level `.vercelignore` files take precedence
over the root file and must carry the same exclusions.

The orchestrator must also align `/api/chat`'s source `maxDuration` export with
60 seconds (it was 120 at this lane's audit), add the same explicit export to
`/api/lens`. Lens failures return an unavailable response with status `503`.
These routes are owned by other lanes. The app's Vercel configuration sets
the API default to 60 seconds; per-route source settings need to agree. See
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
- `DEMO_PASSWORD` and `DEMO_SESSION_SECRET`. Generate the signing secret once with
  `openssl rand -hex 32` and put it in the root `.env`. It must be at least
  32 characters. Changing either credential revokes existing sessions.
- `NEXT_PUBLIC_SITE_URL=https://aim.julianschmidt.cv` and
  `NEXT_PUBLIC_APP_URL=https://app.aim.julianschmidt.cv`. Both must be set **before
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

# Before the rename:
MEDLYN_APP_DIR=apps/web
# After the rename use: MEDLYN_APP_DIR=apps/app

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

vercel domains add aim.julianschmidt.cv medlyn-www
vercel domains add app.aim.julianschmidt.cv medlyn-app
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

Create these records in the DNS zone for `julianschmidt.cv`:

| Type  | Name      | Target                 |
| ----- | --------- | ---------------------- |
| CNAME | `aim`     | `cname.vercel-dns.com` |
| CNAME | `app.aim` | `cname.vercel-dns.com` |

Remove conflicting records for the same names. If Vercel supplies a project-specific
CNAME target or an ownership TXT challenge, use the values shown by
`vercel domains inspect <domain>`. Confirm both domains after DNS propagates:

```sh
vercel domains inspect aim.julianschmidt.cv
vercel domains inspect app.aim.julianschmidt.cv
```

## Verify the deployment

```sh
curl -I https://aim.julianschmidt.cv
curl -I https://app.aim.julianschmidt.cv/patient
curl -i https://app.aim.julianschmidt.cv/api/patient/list
curl -i -X POST https://app.aim.julianschmidt.cv/api/lens
curl -i -X POST https://app.aim.julianschmidt.cv/api/chat
```

Expect a public landing page, a `303` redirect to `/login` for the patient page,
and `401` JSON for unauthenticated APIs. Unconfigured authentication returns `503`.
In a browser, check wrong-password feedback and then sign in. The session cookie
is host-only, HttpOnly, Secure in production, SameSite=Lax, and expires after seven
days. A forged or expired cookie must fail. Exercise one situation, a source link,
chat and a letter against the ingested database; no deployed model call was made
by this lane's dummy-value build checks.

For concurrent local build verification, run Next directly with
`MEDLYN_NEXT_DIST_DIR=.next-deploy-prep` to isolate this lane's app output from
other agents' `.next` builds. Do not set this variable on Vercel. Delete only that
lane-owned build directory after checking it. Run focused auth/env tests with:

```sh
pnpm --dir packages/engine exec vitest run --root ../../apps/web 'app/(auth)'
```

After the directory sweep, replace `apps/web` with `apps/app` in the test command.
Patient-menu logout is a follow-up: clear `medlyn-demo-session` in a server action.
