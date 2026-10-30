import { formatDate } from "@medlyn/engine/dates";

export function displayDates(text: string): string {
  return text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (value, year, month, day) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
    return formatDate(`${year}-${month}-${day}`);
  });
}
