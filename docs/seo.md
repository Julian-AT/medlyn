# Medlyn search and indexing

The public landing page describes a clinical documentation prototype. It is the only
indexable route. The patient app is a separate origin and must stay out of search.
Patient records, conversations, review text and generated letters never belong in
metadata, structured data, social images or public sitemaps.

## Keywords and content

The primary topic is **clinical documentation AI**. Supporting terms are
**source-linked patient summary**, **clinical record review**, **task-focused patient
summaries**, and **clinical documentation prototype**. The page title and 160-character
description describe the prototype without claiming clinical approval or measured
accuracy. Keywords are topic guidance; the metadata keyword list is not a ranking
promise. Keep product claims consistent with verified behavior and the demo-only FAQ.

## Public site

`apps/www/src/lib/seo.ts` centralizes the name, title template (`%s · Medlyn`),
description, canonical origin, locale, author, robots directives, social metadata,
icons and viewport theme color. The layout already declares `lang="en"`.

Set these deployment environment variables **before building**:

```dotenv
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_APP_URL=https://app.example.com
```

Replace both example origins with the deployed HTTPS origins. Only the origin is
used for canonical URLs; paths, query strings and fragments are discarded. Invalid
URLs, non-HTTP(S) URLs and URLs containing credentials fail configuration validation.
`NEXT_PUBLIC_*` values are public. Do not put secrets in them. The landing app does
not load the repository's root `.env` itself: export the values in the build
environment, or have the orchestrator add root-env loading to its Next config.
When using Turbo, add `NEXT_PUBLIC_SITE_URL` to `turbo.json`'s `globalEnv` (the app URL
is already listed) so it is passed through and invalidates cached builds.

The generated routes are:

| Route                   | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `/sitemap.xml`          | Only `/`, with a content modification date                |
| `/robots.txt`           | Allow public crawling; canonical sitemap and host         |
| `/manifest.webmanifest` | Name, description, existing icons and standalone display  |
| `/opengraph-image`      | 1200 × 630 PNG with the existing logo and product tagline |
| `/twitter-image`        | The same artwork for a large Twitter/X card               |

Section anchors such as `#faq` are parts of `/`, not independent pages, and are
excluded from the sitemap. `contentUpdatedAt` changes when published copy changes,
not automatically on every build. Next's image file conventions may add version
queries to the image URLs in rendered metadata.

The page renders safely escaped JSON-LD with an Organization, WebSite and
SoftwareApplication (`HealthApplication`, `Web`, freely accessible demo). There is
no invented price, commercial offer, review score, organization address or social
account. `StructuredData` also supports FAQPage from the existing FAQ array, but
its integration is **pending**: the array is private to a client component outside
this lane's owned paths. Export it from a shared module and pass it to the server
component; do not duplicate the questions or maintain a second copy.

There is one H1 and an existing main landmark; the feature carousel's H3 headings
follow an H2. The wrapper around the introduction and carousel now has an accessible
section label. Existing `next/font/local` preloads the primary font; the hero's
`next/image` already preloads its responsive image. Fonts and the hero image are
same-origin, so there is no external font/image host to preconnect. The image has
a sized fill container. No layout or visible copy changed in this lane.

Remaining changes require the landing component owner's integration: add the hero
video's `preload="metadata"` and `poster="/images/hero-cover.jpg"`; use an appropriate
high-priority LCP image loading strategy; replace the generic hero-cover alt text;
and add `rel="nofollow"` to app CTAs (`noopener noreferrer` as well if opening a new
tab). Decorative images should retain empty alt text and `aria-hidden` rather than
being announced. Replace the existing GitHub and hackathon placeholder destinations
before deployment.

## Patient app

The root layout already exports `robots: { index: false, follow: false }`. The new
`apps/web/app/robots.ts` disallows all crawlers. Each of the 18 pages under `(app)`
gets a static, descriptive browser title such as `Medications · Medlyn`; titles
contain no patient data. The app has no public sitemap.

The requested `X-Robots-Tag: noindex, nofollow` response header is **pending ownership
confirmation** for `apps/web/next.config.ts`. Add it with a `headers()` entry matching
`/:path*`, covering pages, API routes, exports and static assets. Keep the existing
Next config intact. A concrete integration patch is included in the lane handoff.

Crawler directives do not provide access control. Preserve the app's existing
password/authentication boundary. A disallowed crawler cannot fetch a page's
noindex directive; for a URL already indexed before deployment, use Search Console
removal and an appropriate authenticated response rather than exposing records to
make them crawlable.

## Verification

Run with installed dependencies (no install required):

```sh
pnpm --filter @medlyn/www exec tsc --noEmit
pnpm --filter @medlyn/www exec next build
pnpm --filter @medlyn/web exec tsc --noEmit
pnpm --filter @medlyn/web exec next build
```

The www build should list `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest`,
`/opengraph-image` and `/twitter-image`. Start the production builds on separate
ports and inspect the rendered HTML and HTTP responses:

- Confirm the configured canonical origin, title, 160-character description,
  `index, follow`, theme color, OG/Twitter image dimensions and icon URLs.
- Parse `script[type="application/ld+json"]` in the browser. Check entity IDs and
  publisher links, and verify FAQ questions and answers exactly match visible data
  after the shared-data integration. Never infer client-rendered schema is missing
  from a text-only page scraper.
- Fetch the sitemap, robots and manifest URLs. There must be one sitemap URL, no
  app URLs or fragments, and opposite crawl policies on the two origins.
- Fetch both social-image URLs, confirm PNG responses and 1200 × 630 dimensions,
  and inspect the artwork. Check the server's app response header after integration.
- Run [Schema Markup Validator](https://validator.schema.org/) and Google's
  [Rich Results Test](https://search.google.com/test/rich-results) against the public
  deployed page. Valid schema does not guarantee rich-result eligibility.
- Run Lighthouse on the production landing page in mobile mode; target SEO 100,
  then examine accessibility and LCP/CLS separately. Do not publish a score until
  measured. Check the Network panel for font/hero preloads and avoid duplicate
  optimized-image and raw-poster downloads.

Current lane checks: both app TypeScript checks passed. Both full builds were
blocked by concurrently changed `favicon.ico` assets: Next could not decode the
embedded PNG format (`The PNG is not in RGBA format!`). Those assets are outside
this lane. Independent runtime smoke checks passed for canonical/discovery data,
manifest assets, JSON-LD graph/escaping and generation of a 1200 × 630 PNG; the
artwork was visually inspected. A successful production build, live response checks,
Rich Results Test and Lighthouse score remain unverified until integration.

## Deployment follow-up

Integrate the FAQ/media/header requests, repair the ICO build blocker, and rebuild
with the final origins. Redirect alternate public hosts to the chosen canonical
origin. Submit the public sitemap to Search Console and Bing Webmaster Tools, then
monitor indexing and real-user performance. Add public routes only when they carry
substantive, reviewed content; never create search pages from patient data.

References: [Next Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata),
[Next JSON-LD guidance](https://nextjs.org/docs/app/guides/json-ld),
[Schema.org FAQPage](https://schema.org/FAQPage), and
[Schema.org SoftwareApplication](https://schema.org/SoftwareApplication).
The installed Next.js 16.4.3 docs were used for metadata routes and ImageResponse;
Context7 was unavailable in this session.
