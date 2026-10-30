# Shared UI rules

Use the existing shadcn primitives and neutral ElevenLabs theme variables. Clinical
facts, source links, validation and review states keep their engine meanings.

## Size scale

| Element         | Rule                                             |
| --------------- | ------------------------------------------------ |
| Compact control | `h-8`, `text-sm`; source chips may use `text-xs` |
| Default control | `h-9`, `text-sm`                                 |
| Large control   | `h-10`, `text-sm`                                |
| Control icon    | 16px, Hugeicons, stroke 2                        |
| Navigation icon | 18px, Hugeicons, stroke 2                        |
| Control radius  | 10px: `rounded-control`                          |
| Card radius     | 14–16px: `rounded-2xl` (16px)                    |
| Body / metadata | `text-sm` / `text-xs`                            |
| Card padding    | `p-4`; nested CardContent uses `p-0`             |
| Section spacing | `gap-6`                                          |
| List row        | `min-h-10`; allow wrapping for clinical text     |

Do not shrink labels below `text-xs`. Use tabular numbers for values, doses and
dates. Preserve full clinical text when it wraps; use truncation only for preview
headings with an accessible full title. Controls in a group use the same height.

## Sources

Use `components/sources/source-popover.tsx` through `SourceChips` or a source button.
The trigger reads “Source” or names its document/date. One trigger opens the exact
passage and its translation; use the popup's action to open the full document.
Do not add a competing hover preview, modal or source viewer. Existing chart
source navigation delegates to the shared source flow; adjacent source buttons
provide a labelled alternative to clicking a chart point.

## Status badges

| Meaning                                                  | Badge variant / tokens                                    |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Ordinary metadata, counts, trend                         | `secondary`                                               |
| Assertion, temporal status, source date                  | `outline`                                                 |
| Partial, needs clarification, contradicted, needs review | `outline`, `border-warning/30 bg-warning/10 text-warning` |
| Critical / failed operation                              | `destructive`                                             |
| Accepted review                                          | `outline`, `border-success/30 bg-success/10 text-success` |
| Other review state                                       | `secondary`, with a readable sentence-case label          |

Keep availability, assertion, temporal status, completeness, conflict and review
separate. “Documented” never means clinically normal. Medication lists always
name the source and date; never label a source list “current medication”.

## Loading, empty and error states

- Loading uses `Skeleton` with explicit dimensions. Match the final preview's
  viewport and content shape (table rows, chart area or text), with no pulse,
  height animation, streaming text reveal or auto-scroll. Keep header, body and
  action space present in every state. Stable IDs key clinical rows.
- Generative previews use a fixed 320px content viewport; expanded views use
  512px. `ScrollArea` contains overflow. The same viewport holds loading, output,
  empty and error content, so incoming results do not move the conversation.
- Empty views use `Empty`, `EmptyTitle` and `EmptyDescription`. State what is
  empty and give one useful next step. Empty search/chart results never prove
  absence; only the engine's exhaustive documentation check may say “not
  documented”.
- Failed views use `Alert variant="destructive"` inside the reserved viewport.
  Explain the failed action and the next step. Never display raw provider errors
  or promote a failed check into a gap. Retry only when connected to an action.
- Use a single primary action per preview. Name toggles (“German source”,
  “English translation”), tabs (“Medication source lists”) and icon controls.

## Focus

Text controls keep their 1px border: focus changes its color, without a thick
box-shadow ring or a size change. Keyboard focus uses a visible 1px outline with
a 2px offset through `:focus-visible`; grouped controls outline their container
once. Text controls track pointer entry so clicking a text field does not draw
the keyboard outline; tabbing into it does. Preserve destructive borders on invalid controls. Focus must remain
visible in both themes and must never rely on an animation.

## Review gallery

In development, open `/dev/gen-ui`. Load live patient outputs, then inspect all
nine registered tools in `input-streaming`, `input-available`,
`output-available` and `output-error`. “Simulate streaming” cycles the first three
states locally after data loads; it does not send repeated model requests.
Production returns 404 for the page and rejects its server action.
