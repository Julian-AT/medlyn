# Medlyn landing page

Public marketing site; the clinician cockpit lives in the sibling app.
Run commands from the repository root with pnpm.
`pnpm --filter @medlyn/www dev` serves http://localhost:3001.
`pnpm --filter @medlyn/www build` creates the production build.
`pnpm --filter @medlyn/www start` serves the production build on port 3001.
`pnpm --filter @medlyn/www typecheck` checks TypeScript.
Set `NEXT_PUBLIC_APP_URL` at build time; it defaults to http://localhost:3000.
Original landing-page copy, styling, fonts and media are preserved.
