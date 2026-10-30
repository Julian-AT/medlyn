# ElevenLabs → Medlyn design system

The saved ElevenLabs CSS is the source for the neutral system. Pastel category
artwork and gradient tokens are removed. Clinical warning, destructive, success
and chart colours retain their existing meanings. This applies to the patient
app; the supplied `apps/www` landing design is preserved.

## Source and extraction

`Chat _ ElevenLabs_files/1igmyn5m8tc38.css` contains the palette in `:root`,
the dark remapping in `.dark`, and the compiled typography, radius, shadow and
focus utilities. The same stylesheet is included beside Stimmen, Text zu Sprache,
Soundeffekte and Stimmenerstellung. Saved HTML supplies the component combinations:
Stimmen uses a plain `text-2xl` heading, `h-10 rounded-xl` search input, neutral
filter controls and compact rows. `eleven.png` is the sidebar target at 2×;
`current.png` records the earlier oversized spacing and brand.

The values below are extracted from these local files, not estimates of the live
service. The saved source names secondary text `--secondary`, tertiary text
`--subtle`, and alpha fills `--gray-alpha-*`. Medlyn separates these names because
shadcn's `--secondary` means a button background.

## Palette

Solid gray values are achromatic HSL lightness. Dark mode reverses their stops,
including 75 ↔ 925. Alpha values are the source's exact hexadecimal bytes,
including the different light/dark 50 stop. Both scales are exposed as CSS vars
and Tailwind colours: `bg-gray-alpha-100`, `border-gray-alpha-150`, `text-gray-950`.

| Stop | Solid light | Solid dark | Alpha light | Alpha dark  |
| ---- | ----------- | ---------- | ----------- | ----------- |
| 50   | 98%         | 9%         | `#00000005` | `#ffffff06` |
| 75   | 93%         | 13%        | `#00000008` | `#ffffff08` |
| 100  | 89%         | 18%        | `#0000000b` | `#ffffff0b` |
| 150  | 85%         | 23%        | `#00000013` | `#ffffff13` |
| 200  | 81%         | 27%        | `#0000001a` | `#ffffff1a` |
| 250  | 76%         | 32%        | `#00000022` | `#ffffff22` |
| 300  | 72%         | 36%        | `#00000029` | `#ffffff29` |
| 350  | 68%         | 41%        | `#00000041` | `#ffffff41` |
| 400  | 64%         | 46%        | `#00000059` | `#ffffff59` |
| 450  | 59%         | 50%        | `#00000070` | `#ffffff70` |
| 500  | 55%         | 55%        | `#00000087` | `#ffffff87` |
| 550  | 50%         | 59%        | `#00000095` | `#ffffff95` |
| 600  | 46%         | 64%        | `#000000a4` | `#ffffffa4` |
| 650  | 41%         | 68%        | `#000000ad` | `#ffffffad` |
| 700  | 36%         | 72%        | `#000000b6` | `#ffffffb6` |
| 750  | 32%         | 76%        | `#000000c2` | `#ffffffc2` |
| 800  | 27%         | 81%        | `#000000cd` | `#ffffffcd` |
| 850  | 23%         | 85%        | `#000000d4` | `#ffffffd4` |
| 900  | 18%         | 89%        | `#000000db` | `#ffffffdb` |
| 925  | 13%         | 93%        | `#000000df` | `#ffffffdf` |
| 950  | 9%          | 98%        | `#000000e3` | `#ffffffe3` |

## shadcn mapping

| Role                              | Light                | Dark                          |
| --------------------------------- | -------------------- | ----------------------------- |
| Background                        | white                | `hsl(240 3% 6%)`              |
| Text primary / foreground         | `hsl(240 3% 6%)`     | white                         |
| Text secondary / muted foreground | gray-alpha-500       | gray-alpha-600                |
| Text tertiary                     | gray-alpha-450       | gray-alpha-500                |
| Card                              | background           | background                    |
| Surface / sidebar                 | gray-50              | gray-50                       |
| Raised / popover                  | white                | gray-100                      |
| Primary button                    | gray-900, white text | `hsl(210 20% 98%)`, dark text |
| Secondary / accent fill           | gray-alpha-100       | gray-alpha-100                |
| Muted fill                        | gray-alpha-50        | gray-alpha-50                 |
| Border                            | gray-alpha-150       | gray-alpha-150                |
| Input fill                        | gray-alpha-100       | gray-alpha-100                |
| Focus ring                        | foreground           | foreground                    |

Buttons are existing shadcn variants: near-black primary, gray-alpha-100 secondary,
1px gray-alpha-150 outline, transparent ghost with a neutral hover. Pill actions
use `rounded-full`. Badges use the same neutral fill or fine outline; amber and
red are reserved for uncertainty and critical facts. No category gets a tint.
Inputs use gray-alpha-50/100, 12px corners and no heavy border. Search inputs are
40px high; the situation prompt is 48px to accommodate its existing voice controls.
Table rows have fine gray-alpha-100 dividers, neutral hover and 12px metadata;
sticky table headers use the opaque background so underlying text cannot show through.

Cards use white/background, a 1px gray-alpha-150 border, 12–16px corners and at most
shadow-xs for normal evidence cards. Transparent layout containers have no shadow
or ring. Proven gaps retain a dashed outline. Critical badges/bands and warning
badges carry the semantic colour; ordinary evidence card surfaces stay neutral.

## Radius, shadow and focus

Source radii: sm 2px, default 4px, md 6px, lg 8px, xl 12px, 2xl 16px,
3xl 24px, full 9999px. Navigation explicitly uses 10px. Medlyn preserves
`--radius: 10px` for existing consumers and maps Tailwind's radius scale directly;
`rounded-4xl` is a 16px compatibility alias for the generated card preset, while
buttons request full pills explicitly. Generated primitives are not edited.

| Shadow | Extracted CSS value                                  |
| ------ | ---------------------------------------------------- |
| xs     | `0 1px 2px 0 #1018280d`                              |
| sm     | `0 1px 2px 0 #1018280f, 0 1px 3px 0 #1018281a`       |
| md     | `0 2px 4px -2px #1018280f, 0 4px 8px -2px #1018281a` |

The saved primary button markup uses `bg-foreground` (rather than its older
`--primary: gray-900` alias), so the shadcn primary token follows that rendered
variant. The source also supplies `shadow-natural-xs`, `shadow-natural-sm` and
`shadow-natural-md`; all are exposed unchanged. Natural-xs layers a 1px 6% black
outline with `0 1px 1px -0.5px` and `0 3px 3px -1.5px` shadows at the same opacity.
Natural-sm adds `0 6px 6px -3px` at 6% and `0 12px 12px -6px` at 2%; natural-md
uses 4% for the 12px layer and adds `0 24px 24px -12px` at 4%.

The 2xs compatibility token aliases the source xs shadow. The source focus utility
uses a 1.5px foreground ring separated from the control by 2px. Medlyn applies
that geometry through primitive data-slot selectors, replacing the preset's
3px ring on keyboard focus, including grouped inputs. Invalid states retain the
existing semantic error styles.

## Typography

Inter is the saved sans family. Waldenburg is a commercial display face and is
not bundled; Inter 600 is the existing approved heading substitute. Navigation,
controls and section labels are 500, body is 400. Geist Mono stays for source IDs,
doses and dates; changing values use tabular numerals.

| Size | Font / line height | Letter spacing |
| ---- | ------------------ | -------------- |
| xs   | 12 / 16px          | 0.0025em       |
| sm   | 14 / 20px          | 0              |
| base | 16 / 24px          | 0              |
| lg   | 18 / 26px          | -0.0025em      |
| xl   | 20 / 28px          | -0.005em       |
| 2xl  | 24 / 30px          | -0.00625em     |
| 3xl  | 28 / 36px          | -0.0075em      |

Page anatomy is a title and subtitle, followed by the filter/search row and clean
lists or cards. Category icons are neutral small tiles in summary cards; the page
heading itself is plain. Page gutters are 16px mobile / 32px desktop with 32px
between sections. Existing data, claim boundaries, review behaviour and source
links are unchanged.

## Sidebar geometry

| Property                     | Desktop CSS pixels (2× reference pixels) |
| ---------------------------- | ---------------------------------------- |
| Width                        | 256 (512) including right border         |
| Header                       | 50 (100)                                 |
| First navigation top         | 54 (108)                                 |
| Highlight inset              | 12 (24)                                  |
| Row height + gap             | 32 + 4 = 36 pitch (64 + 8 = 72)          |
| Row inner padding            | 8 (16)                                   |
| Icon x                       | 20 (40)                                  |
| Icon box                     | 18 × 18 (36 × 36)                        |
| Icon ↔ label                 | 8 (16)                                   |
| Label x                      | 46 (92)                                  |
| Row corner radius            | 10 (20)                                  |
| Group label inset            | 6 (12), within the 12px gutter           |
| Label height + following gap | 20 + 6 (40 + 12)                         |
| Section gap                  | 20 (40)                                  |
| Footer outer gutter          | 12 (24)                                  |

Inactive text/icons use secondary text; active text uses gray-950, and the active
fill is gray-alpha-100. Hugeicons use stroke 2 by user decision (the reference's
source SVGs use 1.5). The compact brand uses a 20px mark and 16px/600 wordmark.
The pinned patient menu, collapsible groups, persisted history, badge behaviour,
mobile drawer and collapsed rail keep their existing structure. Its two-line
patient footer is the clinical adaptation to the reference's one-line workspace
switcher; its avatar is neutral. No gradient exception is needed.

## Scope and checks

The implementation lives in `apps/app/app/globals.css` and the owned category,
cockpit, generative UI and shell components. Context7 was unavailable; the saved
reference CSS, installed Next.js CSS guide, Tailwind theme and native shadcn source
were inspected instead. Fresh commands, results and cross-lane requests are in
`/private/tmp/medlyn-el-system.md`. Chat, artifact-panel and generated `components/ui`
files are outside this lane; any remaining references there must be integrated by
their owner. Brand source assets and application icon generation remain unchanged.
