import type { Segment } from "../contracts.ts";

const MONTHS = ["jan(?:uary|uar)?", "feb(?:ruary|ruar)?", "mar(?:ch)?|maerz|märz", "apr(?:il)?", "may|mai", "jun(?:e|i)?", "jul(?:y|i)?", "aug(?:ust)?", "sep(?:tember)?", "oct(?:ober)?|okt(?:ober)?", "nov(?:ember)?", "dec(?:ember)?|dez(?:ember)?"];
const MONTH_PATTERN = MONTHS.map((m) => `(?:${m})`).join("|");

function canonical(text: string): string {
  let value = text.toLowerCase().replace(/½/g, "1/2").replace(/¼/g, "1/4").replace(/¾/g, "3/4").replace(/(\d),(?=\d)/g, "$1.");
  value = value.replace(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g, (_, d, m, y) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  value = value.replace(/\b(\d{1,2})\/(\d{4})\b/g, (_, m, y) => `${y}-${m.padStart(2, "0")}`);
  value = value.replace(new RegExp(`\\b(?:(\\d{1,2})\\.?\\s+)?(${MONTH_PATTERN})\\.?\\s+(\\d{4})\\b`, "gi"), (_, d, m, y) => {
    const month = MONTHS.findIndex((pattern) => new RegExp(`^(?:${pattern})$`, "i").test(m)) + 1;
    return `${y}-${String(month).padStart(2, "0")}${d ? `-${d.padStart(2, "0")}` : ""}`;
  });
  return value
    .replace(/\b(?:link(?:s|e|en|er|es|em)|left|li\.?)(?=\W|$)/g, " left ")
    .replace(/\b(?:recht(?:s|e|en|er|es|em)|right|re\.?)(?=\W|$)/g, " right ")
    .replace(/\b(?:beidseits|beidseitig(?:e|en|er|es|em)?|bilaterally|bilateral|bds\.?)(?=\W|$)/g, " bilateral ")
    .replace(/(\d)\s*(?:µg|μg|mcg|ug)\b/g, "$1mcg")
    .replace(/(\d)\s*(mg|kg|g|ml|l|mmhg|mm|cm|mcg|iu|ie|%)/g, "$1$2")
    .replace(/%\s*(?:ige[nrs]?|ig)\b/g, "%")
    .replace(/\b(\d+)\s*(?:percent|prozent)\b/g, "$1%")
    .replace(/\s+/g, " ").trim();
}

const CHECKED = /\d{4}-\d{2}(?:-\d{2})?|\d+\/\d+|\d+(?:\.\d+)?(?:mcg|mg|kg|ml|mmhg|mm|cm|iu|ie|g|l|%)?|\b(?:left|right|bilateral)\b/g;

function strings(value: unknown): string[] {
  if (typeof value === "string" || typeof value === "number") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** Canonical numbers, dates, doses and sides, including nested attributes. */
export function checkedTokens(fields: Record<string, unknown>): string[] {
  return [...new Set(strings(fields).flatMap((value) => canonical(value).match(CHECKED) ?? []))];
}

function folded(text: string): { text: string; map: number[] } {
  let result = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i].toLowerCase();
    if (/\s/.test(char)) {
      if (!result || result.endsWith(" ")) continue;
      result += " ";
    } else result += char;
    map.push(i);
  }
  if (result.endsWith(" ")) { result = result.slice(0, -1); map.pop(); }
  return { text: result, map };
}

function distance(a: string, b: string, limit: number): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let minimum = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      minimum = Math.min(minimum, row[j]);
    }
    if (minimum > limit) return limit + 1;
    previous = row;
  }
  return previous[b.length];
}

function fuzzy(needle: string, haystack: string): [number, number] | null {
  const allowance = Math.floor(needle.length / 9);
  let best: { start: number; end: number; score: number } | null = null;
  for (let start = 0; start < haystack.length; start++) {
    if (start > 0 && /[\p{L}\p{N}]/u.test(haystack[start - 1]) && /[\p{L}\p{N}]/u.test(haystack[start])) continue;
    for (let length = Math.max(1, needle.length - allowance); length <= needle.length + allowance && start + length <= haystack.length; length++) {
      const end = start + length;
      if (end < haystack.length && /[\p{L}\p{N}]/u.test(haystack[end - 1]) && /[\p{L}\p{N}]/u.test(haystack[end])) continue;
      const max = Math.floor(Math.max(needle.length, length) * 0.1 + 1e-9);
      const score = 1 - distance(needle, haystack.slice(start, end), max) / Math.max(needle.length, length);
      if (score >= 0.9 && (!best || score > best.score)) best = { start, end, score };
    }
  }
  return best ? [best.start, best.end] : null;
}

export function locate(quote: string, segment: Segment, fields: Record<string, unknown>):
  | { ok: true; start: number; end: number; quote: string; match: "exact" | "normalised" | "fuzzy" }
  | { ok: false; reason: string } {
  if (!quote.trim()) return { ok: false, reason: "Empty quote" };
  let start = segment.text.indexOf(quote);
  let end = start + quote.length;
  let match: "exact" | "normalised" | "fuzzy" = "exact";
  if (start < 0) {
    const source = folded(segment.text);
    const target = folded(quote).text;
    const index = source.text.indexOf(target);
    const bounds = index >= 0 ? [index, index + target.length] : fuzzy(target, source.text);
    if (!bounds) return { ok: false, reason: "Quote not found with similarity >= 0.9" };
    start = source.map[bounds[0]];
    end = source.map[bounds[1] - 1] + 1;
    match = index >= 0 ? "normalised" : "fuzzy";
  }
  const actual = segment.text.slice(start, end);
  const tokens = new Set(checkedTokens({ passage: actual }));
  for (const token of [...tokens]) {
    const number = token.match(/^\d+(?:\.\d+)?(?=mcg|mg|kg|ml|mmhg|mm|cm|iu|ie|g|l|%)/)?.[0];
    if (number) tokens.add(number);
    if (/^\d{4}-\d{2}(?:-\d{2})?$/.test(token)) {
      tokens.add(token.slice(0, 7));
      tokens.add(token.slice(0, 4));
    }
  }
  const missing = checkedTokens(fields).filter((token) => !tokens.has(token));
  if (missing.length) return { ok: false, reason: `Checked tokens absent from passage: ${missing.join(", ")}` };
  return { ok: true, start: segment.start + start, end: segment.start + end, quote: actual, match };
}
