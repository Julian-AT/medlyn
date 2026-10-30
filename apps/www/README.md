# Medlyn landing page

Public landing page for the Medlyn clinical documentation prototype.

[medlyn.health](https://medlyn.health)

Run from the repository root with Node.js 24+ and pnpm 10.18.0:

```sh
pnpm --filter @medlyn/www dev
```

Open [localhost:3001](http://localhost:3001). Set `NEXT_PUBLIC_SITE_URL` and
`NEXT_PUBLIC_APP_URL` before building to override the public origins. They default
to `https://medlyn.health` and `https://app.medlyn.health`.

- `src/app/`: landing page, metadata and indexing routes.
- `src/components/`: supplied landing design and shared outbound links.
- `src/lib/seo.ts`: public origins and search metadata.
- `public/`: fonts, illustrations and images.

See the [root README](../../README.md) for workspace setup and the
[deployment guide](../../docs/deploy.md) for production configuration.
