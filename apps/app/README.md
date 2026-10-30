# Medlyn app

Patient workspace with source-linked chat, Situations, evidence, reviews and letters.

[app.medlyn.health](https://app.medlyn.health)

Run from the repository root with Node.js 24+ and pnpm 10.18.0:

```sh
pnpm --filter @medlyn/app dev
```

Open [localhost:3000](http://localhost:3000). Configure the root `.env` and ingest the
evidence database using the [root README](../../README.md) first. Public links use
`NEXT_PUBLIC_SITE_URL` and default to `https://medlyn.health`.

- `app/`: pages and streaming API routes.
- `components/`: chat, patient views and the shadcn shell.
- `hooks/`: workspace interactions.
- `lib/`: patient helpers and browser chat storage.
- `data/`: bundled aggregate research snapshot.

Chats stay in this browser, scoped to a random device ID and patient. Browser
storage failures use memory for the current visit. Existing server chat rows are
ignored. The app opens in light mode and remembers theme changes when storage is available.

See the [root README](../../README.md) for setup and [deployment guide](../../docs/deploy.md)
for production configuration. The public demo has no authentication; noindex headers
are crawler controls. Challenge figures are agent-reviewed API checks in
[METRICS.md](../../METRICS.md), not clinician or browser certification.
