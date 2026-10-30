# ElevenLabs → Medlyn theme

Brand lane, 30 Oct 2026. The neutral palette is binding: the teal theme was
reverted in `fbfd472`. Inter supplies body text and headings. Waldenburg is a
commercial display face and is not included. Existing semantic warning, success,
destructive and chart colours keep their clinical meanings; primary actions and
navigation stay neutral.

## Reference and measurement

Measured the saved `Chat _ ElevenLabs.html` and `Stimmen _ ElevenLabs.html`
with their companion CSS in Chromium at 1440 × 849, 16px root. Both captures
agree on the sidebar and header geometry. Measurements include computed CSS,
bounding rectangles and source SVG paths. They describe the saved desktop
captures, not an inferred live-site specification.

The reference uses `--font-sans: inter`. Body text is 400; controls, navigation
and section labels are 500. Navigation tracking is normal. Medlyn display
headings use Inter 600 and `-0.025em` tracking as the approved substitute for
Waldenburg. Body text stays 14px / 20px. Geist Mono remains for values and IDs.

## Sidebar

| Property                      | Saved reference                                 | Medlyn implementation                                               |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| Desktop width                 | 256px (`16rem`), including border               | Native shadcn Sidebar, 256px                                        |
| Background                    | `#fafafa`                                       | `--sidebar: #fafafa`                                                |
| Right border                  | 1px black at 7.5%                               | `--sidebar-border: rgb(0 0 0 / 7.5%)`                               |
| Brand row                     | 50px, 12px outer gutter; logo begins around x20 | 50px row, 12px gutter, 8px inner padding                            |
| Brand treatment               | Black, compact, 18px high combined logo         | Neutral 20px flower mask, 16px / 600 Medlyn wordmark                |
| Row outer gutter              | 12px each side                                  | SidebarGroup `px-3`                                                 |
| Row width                     | 231px in 255px inner sidebar                    | Available inner width, 231px                                        |
| Row height                    | 32px                                            | `h-8`                                                               |
| Row horizontal padding        | 8px                                             | `px-2`                                                              |
| Row radius                    | 10px                                            | `rounded-[10px]`                                                    |
| Row spacing                   | 4px                                             | SidebarMenu `gap-1`                                                 |
| Icon ↔ label gap              | 8px                                             | `gap-2`                                                             |
| Icon box                      | 18 × 18px                                       | Hugeicons 18px                                                      |
| Icon stroke                   | SVG path `stroke-width="1.5"`                   | Hugeicons `strokeWidth={1.5}`                                       |
| Inactive icon colour          | Inherits black at 53%                           | Foreground at 70%, deliberately darker for Hugeicons' visual weight |
| Inactive label                | Inter 14px / 20px, 500, black at 53%            | `text-sm/5 font-medium text-sidebar-foreground`                     |
| Active label and icon         | `#171717` (gray-950)                            | `--sidebar-accent-foreground: #171717`                              |
| Active / hover background     | Black at 4.3% (`--gray-alpha-100`)              | `--sidebar-accent: rgb(0 0 0 / 4.3%)`                               |
| Stronger pressed/menu surface | Black at 10.2% (`--gray-alpha-200`)             | Existing neutral secondary / accent tokens                          |
| Section label                 | 14px / 20px, 500, black at 53%; 6px inner inset | Group label `text-sm/5 font-medium px-1.5`                          |
| Label → first row             | 6px                                             | Group label `mb-1.5`                                                |
| Section spacing               | 20px desktop                                    | SidebarContent `gap-5`                                              |
| Footer gutter                 | 12px sides / bottom, 4px top                    | SidebarFooter `px-3 pb-3 pt-1`                                      |
| Footer row                    | 32px single-line workspace switcher             | 56px two-line patient card; intentional clinical adaptation         |

The reference active Stimmen row computes to the same 32px height, 10px radius,
14px / 500 label and gray-alpha-100 background. In the Chat capture, Studio is the
active sidebar item; Chat is inactive. The comparison therefore uses both captures.

Keep Medlyn's collapsible sections, persistent history, badges and pinned patient
menu. The mobile sidebar and collapsed icon rail retain the native shadcn widths
of 288px and 48px. At collapsed width, groups use 8px outer gutters and hide their
labels. Dark theme values are Medlyn adaptations: sidebar `#181818`, secondary
text `#a6a6a6`, active background `#292929`, active text `#fafafa`.

## Header

Both saved desktop headers measure 50px (`--eleven-header-height: 3.125rem`),
including one bottom border. Medlyn uses a 49px content row and one 1px border.
SidebarTrigger, a centred 16px vertical Separator, Breadcrumb and the optional
Ask Medlyn button share one non-wrapping row. The separator explicitly overrides
its primitive's vertical stretch with
`data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center`.
At narrow widths, the patient breadcrumb hides and the page label truncates.

## Assets

`apps/web/public/brand/logo-source.png` is the untouched supplied source, moved
from the repository root. Its transparent padding is trimmed, its white center
is converted to transparency, and the black silhouette is centered on square
canvases with approximately 12% padding on each edge. The mask and app icon are
512px; Apple icons are 180px on white; ICO files contain 16, 32 and 48px sizes on
white. Web and landing page icons use identical image bytes.

`BrandMark` applies a PNG alpha mask through Tailwind utilities on the native
shadcn Avatar primitive. Its `bg-foreground` is black in light mode and white in
dark mode. No SVG, inline styles or generated primitive edits are required.
Next.js discovers the root icon files and generates their metadata links via its
[app icon convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons).
The mask utilities follow the
[Tailwind mask-image API](https://tailwindcss.com/docs/mask-image).

## Verification

Fresh TypeScript, production builds, formatter results and browser evidence are
recorded in `/private/tmp/medlyn-brand.md`. Reference measurements are retained in
`/private/tmp/medlyn-brand-reference.json`. Context7 was unavailable in this
session; installed Next.js guides, native shadcn source and official documentation
were consulted directly.
