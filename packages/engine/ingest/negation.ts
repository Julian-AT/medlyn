import type { Assertion } from "../contracts.ts";
import { NEGATION_TRIGGERS } from "./negation-triggers.ts";

// Adapted from https://github.com/DFKI-NLP/pynegex (PSF licence; see negation-triggers.ts).
const SCOPE_WORDS = 6;
const fold = (value: string) => value.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const RULES = [...NEGATION_TRIGGERS]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([term, tag]) => ({ tag, regex: new RegExp(`(?<![a-z0-9])${fold(term).split(/\s+/).map((part) => escape(part.replace(/\\\?/g, "?"))).join("\\s+")}(?![a-z0-9])`, "g") }));

/** A conservative review flag, never an assertion verdict or a substitute for semantic checking. */
export function negationFlag(passage: string, concept: string, assertion: Assertion): boolean {
  if (assertion !== "present" || !concept.trim()) return false;
  const text = fold(passage);
  const pattern = fold(concept).trim().split(/\s+/).map(escape).join("\\s+");
  const concepts = [...text.matchAll(new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "g"))];
  if (!concepts.length) return false;
  const triggers: { start: number; end: number; tag: string }[] = [];
  for (const rule of RULES) {
    for (const match of text.matchAll(rule.regex)) {
      const start = match.index;
      const end = start + match[0].length;
      if (!triggers.some((t) => start < t.end && end > t.start)) triggers.push({ start, end, tag: rule.tag });
    }
  }
  return concepts.some((conceptMatch) => {
    const start = conceptMatch.index;
    const end = start + conceptMatch[0].length;
    return triggers.some((trigger) => {
      const before = trigger.tag === "PREN" && trigger.end <= start;
      const after = trigger.tag === "POST" && trigger.start >= end;
      if (!before && !after) return false;
      const gapStart = before ? trigger.end : end;
      const gapEnd = before ? start : trigger.start;
      const gap = text.slice(gapStart, gapEnd);
      if (/[;!?]|\.(?:\s|$)/.test(gap) || (gap.match(/\b[a-z0-9]+\b/g)?.length ?? 0) > SCOPE_WORDS) return false;
      return !triggers.some((t) => t !== trigger && t.start >= gapStart && t.end <= gapEnd);
    });
  });
}
