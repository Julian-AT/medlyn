const MONTHS = [
  ["jan", "january", "januar", "jänner"], ["feb", "february", "februar"],
  ["mar", "march", "mär", "märz"], ["apr", "april"], ["may", "mai"], ["jun", "june", "juni"],
  ["jul", "july", "juli"], ["aug", "august"], ["sep", "sept", "september"],
  ["oct", "october", "okt", "oktober"], ["nov", "november"], ["dec", "december", "dez", "dezember"],
];
const monthPattern = MONTHS.flat().join("|");
const DATE = new RegExp(`\\b(?:(\\d{4})-(\\d{2})(?:-(\\d{2}))?|(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4})|(?:(\\d{1,2})\\s+)?(${monthPattern})\\.?\\s+(\\d{4}))\\b`, "giu");
const GROUPS = [
  ["left", "links", "linke", "linken", "linker", "linkes", "linkem", "li"],
  ["right", "rechts", "rechte", "rechten", "rechter", "rechtes", "rechtem", "re"],
  ["bilateral", "bilaterally", "beidseits", "beidseitig", "beidseitige", "bds"],
  ["no", "not", "without", "neither", "absent", "negative", "kein", "keine", "keinen", "keiner", "keines", "keinem", "nicht", "ohne", "weder", "negativ", "keinerlei", "none", "never", "denies", "denied", "excluded", "nein", "verneint", "verneinte", "ausgeschlossen", "ausschluss"],
];

export function hasNegation(text: string): boolean {
  return words(text).some((word) => GROUPS[3].includes(word));
}

function words(text: string): string[] {
  return text.toLocaleLowerCase("de").match(/[\p{L}]+/gu) ?? [];
}

function tokens(text: string, source = false): Set<string> {
  const found = new Set<string>();
  const expanded = text.normalize("NFKC").replace(/1⁄2|½/gu, "0.5").replace(/1\/2/gu, "0.5").replace(/−/gu, "-");
  const rest = expanded.replace(DATE, (_, y, m, d, dd, mm, yy, day, month, year) => {
    const monthIndex = month ? MONTHS.findIndex((names) => names.includes(month.toLowerCase())) + 1 : 0;
    const yr = y ?? yy ?? year;
    const mo = m ?? mm ?? String(monthIndex);
    const dy = d ?? dd ?? day;
    const base = `${yr}-${String(Number(mo)).padStart(2, "0")}`;
    found.add(`date:${base}${dy ? `-${String(Number(dy)).padStart(2, "0")}` : ""}`);
    found.add(`month:${Number(mo)}`);
    if (source) {
      found.add(`date:${base}`);
      found.add(`number:${Number(yr)}`);
    }
    return " ";
  });
  for (const match of rest.matchAll(/\d+(?:[.,]\d+)?/gu)) found.add(`number:${Number(match[0].replace(",", "."))}`);
  for (const match of rest.matchAll(/(?:^|[\s(:,])([+-]\d+(?:[.,]\d+)?)/gu)) found.add(`signed:${Number(match[1].replace(",", "."))}`);
  for (const match of rest.matchAll(/(\d+(?:[.,]\d+)?)\s*(mcg|µg|μg|ug|mg|kg|mmhg|mmol|cm|mm|ml|g|%)(?![\p{L}])/giu)) {
    const unit = /^(?:mcg|µg|μg|ug)$/iu.test(match[2]) ? "mcg" : match[2].toLowerCase();
    found.add(`quantity:${Number(match[1].replace(",", "."))}:${unit}`);
  }
  const dose = "(?:\\d+(?:[.,]\\d+)?)";
  const schedulePattern = new RegExp(`(?<![\\p{L}\\d])(${dose})[ -]+(${dose})[ -]+(${dose})(?:[ -]+(${dose}))?(?![\\p{L}\\d])`, "gu");
  for (const match of rest.matchAll(schedulePattern)) {
    const columns = match.slice(1).filter((column): column is string => column !== undefined).map((column) => String(Number(column.replace(",", "."))));
    found.add(`schedule:${columns.join("-")}`);
    if (source && columns.length === 4 && columns[3] === "0") found.add(`schedule:${columns.slice(0, 3).join("-")}`);
  }
  for (const word of words(rest)) {
    const index = MONTHS.findIndex((names) => names.slice(1).includes(word) && word !== "may");
    if (index !== -1) found.add(`month:${index + 1}`);
  }
  for (const word of words(text)) {
    const group = GROUPS.findIndex((entries) => entries.includes(word));
    if (group !== -1) found.add(group === 3 ? "negation" : `side:${GROUPS[group][0]}`);
  }
  const units: [RegExp, string][] = [
    [/\bmg\b/giu, "mg"], [/\b(?:mcg|µg|μg|ug)\b/giu, "mcg"], [/\bkg\b/giu, "kg"],
    [/\bmmhg\b/giu, "mmhg"], [/\bmmol\b/giu, "mmol"], [/\bcm\b/giu, "cm"], [/\bmm\b/giu, "mm"], [/%/gu, "%"],
  ];
  for (const [pattern, unit] of units) if (pattern.test(text)) found.add(`unit:${unit}`);
  return found;
}

/** Checks sensitive surface tokens; semantic support is a separate check. */
export function codeCheck(text: string, sources: string[]): { ok: boolean; missing: string[] } {
  const available = new Set(sources.flatMap((source) => [...tokens(source, true)]));
  const missing = [...tokens(text)].filter((token) => !available.has(token));
  return { ok: missing.length === 0, missing };
}
