# ElevenLabs → Medlyn theme

R1 design contract, 30 Oct 2026. The chat, shell, categories and generative UI share
`apps/web/app/globals.css`. Keep the existing radix-luma primitives; apply Tailwind
utilities to those primitives and use semantic tokens. Primary actions are near-black
in light mode and near-white in dark mode. Status colours describe clinical state.

## Evidence and limits

The extraction script `/private/tmp/medlyn-extract-tokens.py` parses the saved
`Startseite _ ElevenLabs.html`; full counts, arbitrary values, CSS variables, dark
variants, inline styles and control classes are in
`/private/tmp/medlyn-elevenlabs-extraction.json`. It found 1,687 elements and 7,089
class occurrences. Counts include repeated navigation and hidden responsive copies;
they describe this saved page, not a complete product stylesheet.

The five linked application CSS files in `Startseite _ ElevenLabs_files/` are absent.
Exact computed values for named greys, `text-xm`, `shadow-natural-xs` and Waldenburg
cannot be recovered from this file. The tables distinguish measured declarations
from inferred mappings. The captured page is light; dark classes and Sonner's embedded
dark palette are available, but the dark surface ramp is an adaptation.

## Colour mapping

Hex values below are complete CSS colours. ElevenLabs `text-secondary` maps to
**`text-muted-foreground`**, since shadcn `secondary` is a background surface.

| ElevenLabs evidence                                             | shadcn variable                                             | Light                       | Dark                            | Basis                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------- | ------------------------------- | -------------------------------------------------- |
| `bg-background` ×31; Sonner `--normal-bg: #fff`                 | `--background`                                              | `#ffffff`                   | `#141414`                       | Exact light; inferred dark                         |
| `text-foreground` ×44; Sonner `--gray12: hsl(0 0% 9%)`          | `--foreground`, `--card-foreground`, `--popover-foreground` | `#171717`                   | `#fafafa`                       | Embedded neutral endpoints                         |
| `bg-white` and `dark:bg-gray-75`                                | `--card`                                                    | `#ffffff`                   | `#1c1c1c`                       | Inferred surface hierarchy                         |
| Background menus and search overlay                             | `--popover`                                                 | `#ffffff`                   | `#202020`                       | Inferred surface hierarchy                         |
| `bg-foreground text-background`; black/white primary controls   | `--primary` / `--primary-foreground`                        | `#171717` / `#ffffff`       | `#fafafa` / `#171717`           | Measured roles, adapted endpoints                  |
| `bg-gray-alpha-150` / `bg-gray-alpha-200`                       | `--secondary` / `--secondary-foreground`                    | `#f3f3f3` / `#171717`       | `#292929` / `#fafafa`           | Inferred                                           |
| `bg-gray-50` ×5                                                 | `--muted`                                                   | `#f7f7f7`                   | `#242424`                       | Inferred                                           |
| `text-secondary` ×130; Sonner `--gray11: hsl(0 0% 43.5%)`       | `--muted-foreground`                                        | `#6f6f6f`                   | `#a6a6a6`                       | Embedded light grey; inferred dark                 |
| `hover:bg-gray-alpha-100` ×62                                   | `--accent` / `--accent-foreground`                          | `#f0f0f0` / `#171717`       | `#303030` / `#fafafa`           | Inferred hover fill                                |
| `border-gray-alpha-200`; Sonner `--gray4: hsl(0 0% 93%)`        | `--border`                                                  | `#ededed`                   | white 10%                       | Embedded light grey; inferred dark                 |
| Outlined input / button borders                                 | `--input`                                                   | `#e4e4e4`                   | white 15%                       | Inferred, stronger than dividers                   |
| `focus-visible:border-foreground`, `focus-visible:ring-[0.5px]` | `--ring`                                                    | `#171717`                   | `#d4d4d4`                       | Neutral focus; retain primitive ring width         |
| Sidebar is background-like with muted navigation                | `--sidebar` / `--sidebar-foreground`                        | `#fafafa` / `#6f6f6f`       | `#181818` / `#a6a6a6`           | Inferred                                           |
| Active navigation `bg-gray-alpha-100 text-gray-950`             | `--sidebar-accent` / `--sidebar-accent-foreground`          | `#eeeeee` / `#171717`       | `#292929` / `#fafafa`           | Measured roles, inferred colours                   |
| Sidebar primary action                                          | `--sidebar-primary` / `--sidebar-primary-foreground`        | `#171717` / `#ffffff`       | `#fafafa` / `#171717`           | Same neutral action pair                           |
| Sidebar hairline / focus                                        | `--sidebar-border` / `--sidebar-ring`                       | `#ededed` / `#171717`       | white 10% / `#d4d4d4`           | Same divider/focus roles                           |
| Sonner `--error-text`                                           | `--destructive` / `--destructive-foreground`                | `hsl(0 100% 45%)` / white   | `hsl(358 100% 81%)` / `#171717` | Embedded palette                                   |
| Sonner amber `hsl(31 92% 45%)`, dark `hsl(46 87% 65%)`          | `--warning` / `--warning-foreground`                        | `#976009` / white           | `hsl(46 87% 65%)` / `#171717`   | Preserve Medlyn's darker accessible amber in light |
| Sonner green `hsl(140 100% 27%)` / `hsl(150 86% 65%)`           | `--success` / `--success-foreground`                        | `hsl(140 100% 25%)` / white | `hsl(150 86% 65%)` / `#171717`  | Light darkened for small text                      |
| Sonner blue `hsl(210 92% 45%)` / `hsl(216 87% 65%)`             | `--info` / `--info-foreground`                              | `hsl(210 92% 45%)` / white  | `hsl(216 87% 65%)` / `#171717`  | Embedded palette                                   |

`text-warning`, `text-success`, `text-info` and their `bg-*` / `*-foreground`
utilities are registered alongside shadcn's normal colours. Use foreground partners
on solid status fills. Reserve amber for contradictions / clarification and red for
critical or destructive states. Status must also have a label or icon.

The reference has no data chart. `--chart-1..5` are Medlyn adaptations, in stable
blue, green, amber, purple, rose order: light `#2163c5`, `#00802b`, `#976009`,
`#8055bd`, `#c34453`; dark `#79abf3`, `#59eda3`, `#f3cf58`, `#ba9be9`, `#ff9ea1`.
Use legend labels and point markers; a chart colour alone never encodes status.
`--surface` and `--red` remain aliases for existing consumers.

## Shape and elevation

| Measured reference                                              | Medlyn rule                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `rounded-[10px]` ×85, `rounded-[inherit]` ×92                   | `--radius: 0.625rem` (10px); `rounded-lg` for buttons/navigation               |
| `rounded-xl` ×60, `rounded-lg` ×40, `rounded-md` ×20            | Keep luma ratios: sm 6px, md 8px, lg 10px, xl 14px                             |
| `rounded-2xl` ×10, `rounded-3xl` ×3                             | 2xl 18px, 3xl 22px, 4xl 26px; cards xl/2xl, chat composer 4xl                  |
| `rounded-full` ×44                                              | Pills, avatars and circular icon buttons only                                  |
| Border utilities; 1.5px selected tab underline ×2               | Standard `border` (1px); keep selected tab styling in the primitive            |
| `shadow-none` ×14 plus important variant ×11                    | Flat panels and navigation; avoid elevation on every card                      |
| `shadow-natural-xs` ×13 plus important variant ×3               | `shadow-2xs` for the quietest elevation; exact named source shadow unavailable |
| Explicit `0 2px 1px rgba(0,0,0,.04), 0 0 1px rgba(0,0,0,.4)` ×3 | `shadow-xs`, exact light shadow; dark uses a softer white edge                 |
| Explicit half-pixel edge + 1px / 2–4px shadow ×1                | `shadow-sm` for menus/composer; exact light shadow, adapted dark               |

Keep shadcn focus rings visible. The reference has half-pixel focus edges and one
`focus-visible:ring-2`; do not shrink existing accessible primitive rings to copy it.

## Typography and density contract

The saved page sets `--font-sans: inter`. Four headings use `font-waldenburg`, whose
font file and licence are absent. Use **Inter for both UI and headings** through
`next/font/google` (`--font-inter`, latin + latin-ext, swap); this is an exact UI
family match and a free heading substitute. Geist Mono remains the existing bundled
`next/font/local` font for values, dates, doses and identifiers. Duplicate Geist Sans
loaders and the self-referencing sans variable are removed. Font loading follows the
[Next.js font guide](https://nextjs.org/docs/app/getting-started/fonts); theme mappings
follow [Tailwind's theme variable guide](https://tailwindcss.com/docs/theme).

Keep the root 16px rem scale. Body defaults to **14px / 20px**, with local 13px labels
where needed; do not set `html` to 14px, which would shrink the 16rem sidebar and all
spacing. `text-sm` occurs ×106, `text-xs` ×15, `text-xm` ×9 (custom size unknown),
`text-[0.6875rem]` ×2. `font-medium` occurs ×121, normal ×11, semibold ×1; no tracking
utilities occur. Use normal tracking, 400 for prose, 500 for controls/section titles,
and 600 sparingly. Keep clinical prose readable at 14px or larger.

| Area            | Measured evidence                                                   | Shared implementation rule                                                                     |
| --------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Sidebar         | `--eleven-sidebar-width: 16rem`, `w-[16rem]`                        | 256px desktop; use SidebarProvider's existing 16rem default                                    |
| Navigation      | `h-8` ×92 across the page; repeated 10px rounded nav items          | 32px rows, 8px icon/label gap, 8–12px horizontal padding                                       |
| Page width      | Main `mx-auto w-full max-w-6xl pb-8`                                | Content max 1152px, centred; chat transcript/composer max 768px (adaptation)                   |
| Page padding    | Header `px-2.5`; content `max-sm:px-4`, responsive `px-8`           | Pages `px-4 py-6 md:px-8`; align page title and tables                                         |
| Sections        | `gap-10` ×2, `gap-y-8` ×1                                           | 32px between data sections; 40px for major landing groups                                      |
| Related content | `gap-2` ×51; `gap-1` ×12; `gap-2.5` ×12                             | 8px control gap; 4px label/meta gap; 12–16px within cards                                      |
| Cards and lists | Inline 12px grid gap; compact `px-2` / `px-3` repeated              | Card padding 20–24px, grid gap 16px, compact list rows 36–40px; these are adaptations          |
| Buttons         | `h-8` ×92; `h-9` ×8; `h-10` ×15 (all elements)                      | Default 32px (`h-8 px-3 text-sm`), roomy 36px; icon controls 32–40px                           |
| Inputs          | Search input fills parent (`h-full`); no standalone height measured | Single-line 36px (`h-9`), 14px text, 12px horizontal inset; composer min 104px (adaptations)   |
| Tables          | No `table` or `tr` in this saved home page                          | Adaptation: header 36px, body min 40px, cells `px-3 py-2`; grow rows for wrapped clinical text |
| Heading scale   | `text-2xl` ×3, `text-3xl` ×1                                        | Page title 24px / 32px, greeting up to 30px, section title 14–16px medium                      |
| Icons           | Repeated 18px / 20px, stroke 1.5 ×39                                | Hugeicons 18–20px, keep generated UI components untouched                                      |

Use `bg-card`, `text-muted-foreground`, `border-border`, `rounded-xl` and `shadow-xs`
utilities instead of hardcoded greys. Responsive and hidden duplicate counts do not
justify copying every reference control size. Preserve existing theme preference
behaviour and letter print rules. This lane changes theme/font only; page structure
and component density are applied by the shell/chat/generative UI lanes.

## R1 verification artifacts

Before: `/private/tmp/medlyn-tokens-before-light.png` and
`/private/tmp/medlyn-tokens-before-dark.png`, captured from the existing production
build with `MEDLYN_MOCK=1 pnpm exec next start --port 3117`.

After: `/private/tmp/medlyn-tokens-after-light.png` and
`/private/tmp/medlyn-tokens-after-dark.png`. These are **theme previews on that same
production DOM**, with the complete updated CSS compiled through the installed Tailwind PostCSS
plugin and cached Inter font injected through browser tooling. They are not proof of an integrated rebuild.
The attempted new production build was blocked by the concurrent engine UI tools
import of `ai`, which was not resolvable from that package. Recapture the integrated
app after the chat/shell lanes finish. The compiled stylesheet is temporary at
`/private/tmp/medlyn-tokens-compiled.css`; it is not application source.

Browser-computed body: Inter, 14px, light `rgb(255,255,255)`, dark `rgb(20,20,20)`.
Measured contrast on the preview: foreground/background 17.93:1 light / 17.65:1 dark;
muted/card 5.02 / 7.00; sidebar text/surface 4.81 / 7.29. Solid status foreground
pairs are at least 4.67:1 light and 6.04:1 dark. These are token-pair checks, not a
full accessibility audit.
