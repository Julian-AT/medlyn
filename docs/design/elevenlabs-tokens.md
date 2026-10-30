# ElevenLabs → Medlyn theme

P2 design contract, 30 Oct 2026. Chat, shell, categories and generative UI share
`apps/web/app/globals.css`. Keep the installed native shadcn primitives and use
semantic utilities. The approved Medlyn adaptation is **teal for interactive and
verified states**, amber for contradictions / clarification and red for critical
or destructive states. Do not copy reference assets or introduce colours in components.

## Reference evidence

`/private/tmp/medlyn-theme-extract.py` reads all six saved ElevenLabs HTML pages and
their CSS using Python's standard library. Its complete extraction is
`/private/tmp/medlyn-theme-reference.json`. The five available application captures
have 25 CSS files with five unique contents. Startseite's companion folder is absent;
the other captures supply the shared CSS that was missing during R1.

Counts include hidden responsive copies and repeated navigation. They describe the
saved captures, not every page or component in the live product.

| Capture           | Elements | `h-8` | `font-medium` | `text-sm` | `rounded-[10px]` |
| ----------------- | -------: | ----: | ------------: | --------: | ---------------: |
| Chat              |     1533 |    92 |           106 |       103 |               98 |
| Stimmen           |     5320 |   160 |           257 |       228 |              205 |
| Text zu Sprache   |     1342 |    85 |            79 |        57 |               77 |
| Soundeffekte      |     2194 |   126 |           201 |        66 |               83 |
| Stimmenerstellung |     1547 |    95 |           111 |        77 |               82 |
| Startseite        |     1687 |    92 |           121 |       106 |               85 |

Shared CSS confirms `text-sm` as 14px / 20px, `font-medium` as 500, and `h-8`
as 32px at the 16px root. Its foreground is `hsl(240 3% 6%)`; `text-secondary`
uses black at about 53% opacity in the light theme (`--tw-darken-500: #00000087`).
Navigation hover uses `--gray-alpha-100`, black at about 4% opacity. SVGs repeatedly
use a 1.5px stroke, with 18–20px icon sizing in markup. Medlyn uses the approved
slightly bolder 1.75px Hugeicons treatment in the component lanes.

## Colour contract

All colour literals live in `globals.css`. Values in this document describe those
tokens; component code uses `bg-primary`, `text-primary`, `text-muted-foreground`,
`border-border` and other semantic utilities.

| Role                         | Light                        | Dark                         |
| ---------------------------- | ---------------------------- | ---------------------------- |
| Background                   | `#ffffff`                    | `#141414`                    |
| Foreground                   | `#101011`                    | `#fafafa`                    |
| Card                         | `#ffffff`                    | `#1c1c1c`                    |
| Popover                      | `#ffffff`                    | `#202020`                    |
| Primary                      | `oklch(0.51 0.086 190)`      | `oklch(0.72 0.12 190)`       |
| Primary foreground           | `#ffffff`                    | `#102321`                    |
| Primary hover source         | `oklch(0.44 0.07 190)`       | `oklch(0.78 0.105 190)`      |
| Muted surface                | `#f7f7f7`                    | `#242424`                    |
| Muted foreground             | `#666666`                    | `#a6a6a6`                    |
| Secondary surface            | `#f3f3f3`                    | `#292929`                    |
| General hover surface        | `#f0f0f0`                    | `#303030`                    |
| Border                       | `#ededed`                    | white at 10%                 |
| Input border                 | `#e4e4e4`                    | white at 15%                 |
| Sidebar surface              | `#fafafa`                    | `#181818`                    |
| Sidebar foreground           | foreground                   | foreground                   |
| Sidebar accent               | `oklch(0.96 0.018 190)`      | `oklch(0.26 0.035 190)`      |
| Sidebar accent foreground    | primary                      | primary                      |
| Focus ring / sidebar primary | primary                      | primary                      |
| Verified / success           | primary + primary foreground | primary + primary foreground |

The proposed light `oklch(0.62 0.12 190)` does not reach 4.5:1 on white; its
lightness and chroma are reduced for small links and labels. Both adopted primary
colours fit sRGB without clipping. Native solid buttons and linked badges retain
their generated 80%-opacity hover utility; a scoped hover token keeps their text
contrast above 4.5:1 on the default surfaces. Other variants keep their own styling.

`--success` and its foreground are aliases of the primary pair, so existing verified
badges become teal. `--ring`, `--sidebar-ring`, `--sidebar-primary` and `--chart-1`
share the primary token. State always needs a label or icon as well as colour.

| Chart token | Light     | Dark      | Use                                        |
| ----------- | --------- | --------- | ------------------------------------------ |
| `--chart-1` | primary   | primary   | Main series                                |
| `--chart-2` | `#64748b` | `#94a3b8` | Slate comparison                           |
| `--chart-3` | warning   | warning   | Reserved for contradiction / clarification |
| `--chart-4` | `#8055bd` | `#ba9be9` | Violet comparison                          |
| `--chart-5` | `#0369a1` | `#7dd3fc` | Sky comparison                             |

Skip chart-3 for ordinary multi-series data. Use labels and point markers rather
than colour alone. The existing warning, destructive and info pairs remain available;
`--surface` and `--red` remain compatibility aliases. Focus-ring widths and letter
print rules are preserved.

## Type, shape and density

Inter already loads through `next/font/google` (`--font-inter`, latin + latin-ext,
swap) and supplies both body and headings. Geist Mono stays available for values,
dates and identifiers. Keep the root at 16px: body is 14px / 20px, prose weight 400,
controls / navigation 500, page headings 600. Headings and native CardTitle use
`--heading-tracking: -0.025em`; body tracking stays normal. This tighter heading
tracking is an approved Medlyn adaptation, absent from the captures.

Muted labels use stronger accessible greys, visually near 60% foreground. Navigation
inherits the full foreground; group labels opt into `text-muted-foreground`.

| Area               | Shared rule                                                           |
| ------------------ | --------------------------------------------------------------------- |
| Sidebar            | Existing native defaults: desktop 256px, mobile 288px, icon rail 48px |
| Navigation         | 32px rows, 10px radius, 18px icons, `text-sm font-medium`             |
| Controls           | 10px radius; 32px compact / 36px default height                       |
| Cards and composer | 16px radius; normal Card padding from its primitive                   |
| Radius scale       | sm 6px, md 8px, lg 10px, xl / 2xl 16px, 3xl 20px                      |
| Page title         | 24px / 32px, semibold, tight tracking                                 |
| Page width         | About 1100px, centred; reference `max-w-6xl` is 1152px                |
| Chat transcript    | About 768px, centred (Medlyn adaptation)                              |
| Page padding       | 16px compact / 32px desktop                                           |
| Spacing            | 8px between controls, 16px in card grids, 32px between sections       |
| Borders            | Native 1px hairlines; preserve accessible focus edges                 |
| Elevation          | Quiet `shadow-xs` / `shadow-sm`; existing elevation tokens retained   |

The generated preset uses `rounded-4xl` for both Button and Card. The mapped
`--radius-component` defaults to `--radius-card` (16px); existing native control slots
scope that variable to `--radius-control` (10px). This changes tokens without editing
generated primitives or overriding utility declarations. Explicit `rounded-full`
and component-level radius utilities still work. `rounded-xl` also resolves to 16px
for page lanes using that semantic size. No sidebar source change is needed.

Theme mappings follow [Tailwind's theme variable guide](https://tailwindcss.com/docs/theme)
and [shadcn's CSS variable theming guide](https://ui.shadcn.com/docs/theming).
Context7 was unavailable in this session; those official sources were checked directly.

## Verification boundary

`/private/tmp/medlyn-theme-contrast.py` reads the actual light/dark CSS variables,
converts OKLCH to linear sRGB and calculates WCAG contrast, including native solid
hover opacity and active-navigation tint. Results are in
`/private/tmp/medlyn-theme-contrast.json`. These token-pair checks do not replace a
full accessibility audit or browser screenshots.

All 32 checked pairs reach 4.5:1; all tested OKLCH colours fit sRGB without clipping.

| Pair                                            |  Light |   Dark |
| ----------------------------------------------- | -----: | -----: |
| Primary / background                            | 5.50:1 | 7.83:1 |
| Primary foreground / solid primary              | 5.50:1 | 6.95:1 |
| Primary foreground / native hover on background | 4.62:1 | 5.78:1 |
| Sidebar accent foreground / accent              | 4.93:1 | 6.52:1 |
| Primary / 10% teal tint on sidebar              | 4.59:1 | 6.47:1 |
| Muted foreground / card                         | 5.74:1 | 7.00:1 |

The lane report `/private/tmp/medlyn-theme.md` records current TypeScript, production
build and Biome outcomes. The orchestrator owns integrated light/dark screenshots;
P2 does not launch Chrome. Older R1 screenshots were theme previews on a previous
production DOM and are not verification of this pass.
