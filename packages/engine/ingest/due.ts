export type DerivedDue = { dueDate: string; datePrecision: "day" | "month" | "year" | "approx" };

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Resolve an explicitly relative German follow-up interval against its document date. */
export function deriveDueDate(docDate: string, phrase: string | null): DerivedDue | null {
  if (!phrase || !validDate(docDate)) return null;
  const text = phrase.toLowerCase();
  const absolute = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (absolute) {
    const value = `${absolute[3]}-${absolute[2].padStart(2, "0")}-${absolute[1].padStart(2, "0")}`;
    return validDate(value) ? { dueDate: value, datePrecision: "day" } : null;
  }
  const words: Record<string, number> = {
    ein: 1,
    eine: 1,
    einer: 1,
    einem: 1,
    einen: 1,
    zwei: 2,
    drei: 3,
    vier: 4,
    sechs: 6,
    zwölf: 12,
  };
  const match = text.match(
    /\b(?:in|nach|innerhalb(?: von)?)\s+(\d+|ein(?:e[rnm]?)?|zwei|drei|vier|sechs|zwölf)\s*(tag\w*|woch\w*|monat\w*|jahr\w*)/,
  );
  if (!match) return null;
  const amount = words[match[1]] ?? Number(match[1]);
  if (!Number.isInteger(amount) || amount < 0 || amount > 1200) return null;
  const date = new Date(`${docDate}T00:00:00Z`);
  if (/^(monat|jahr)/.test(match[2])) {
    const months = amount * (match[2].startsWith("jahr") ? 12 : 1);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months);
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return { dueDate: date.toISOString().slice(0, 7), datePrecision: "approx" };
  }
  date.setUTCDate(date.getUTCDate() + amount * (match[2].startsWith("woch") ? 7 : 1));
  return { dueDate: date.toISOString().slice(0, 10), datePrecision: "approx" };
}
