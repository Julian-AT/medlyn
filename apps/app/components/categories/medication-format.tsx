import type { MedicationAttrs } from "@medlyn/engine/contracts";
import { formatDate } from "@medlyn/engine/dates";

export const MEDICATION_TIMES = ["Morning", "Midday", "Evening", "Night"] as const;

export function medicationDose(value: string): string {
  const dose = value.trim();
  if (/^(?:1\/2|0[.,]5|½)$/.test(dose)) return "½";
  if (/^(?:1\/4|0[.,]25|¼)$/.test(dose)) return "¼";
  if (/^(?:3\/4|0[.,]75|¾)$/.test(dose)) return "¾";
  return dose;
}

export function medicationRoute(route: string | null): string {
  if (!route?.trim()) return "—";
  const labels: Record<string, string> = {
    oral: "Oral",
    po: "Oral",
    "p.o.": "Oral",
    "s.c.": "Subcutaneous",
    "i.v.": "Intravenous",
    "i.m.": "Intramuscular",
  };
  return labels[route.trim().toLowerCase()] ?? route;
}

export function medicationStrength(attrs: MedicationAttrs): string {
  const { strength, unit } = attrs;
  if (!strength?.trim()) return "—";
  if (unit && /^(?:mg|mcg|µg|μg|g|ml)$/i.test(unit) && !strength.includes(unit)) {
    return `${strength} ${unit}`;
  }
  return strength;
}

export function medicationScheduleText(attrs: MedicationAttrs): string {
  const schedule = attrs.schedule
    ? attrs.schedule.map(medicationDose).join("–")
    : attrs.scheduleText;
  return [schedule, attrs.schedule && attrs.scheduleText].filter(Boolean).join(" · ");
}

export function medicationSummary(attrs: MedicationAttrs): string {
  return [
    attrs.brand && attrs.brand.toLowerCase() !== attrs.generic.toLowerCase() && attrs.brand,
    medicationStrength(attrs),
    medicationScheduleText(attrs),
    attrs.route && medicationRoute(attrs.route),
  ]
    .filter((value) => value && value !== "—")
    .join(" · ");
}

export function medicationListLabel(label: string): string {
  return label
    .replace(/\bcurrent medication\b/gi, "Medication list")
    .replace(/\d{4}-\d{2}-\d{2}/g, (date) => formatDate(date));
}

export function medicationIdentity(generic: string): string {
  return generic.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function medicationRegimenKey(attrs: MedicationAttrs): string {
  return JSON.stringify([
    medicationIdentity(attrs.brand ?? ""),
    medicationIdentity(medicationStrength(attrs)),
    medicationRoute(attrs.route),
    attrs.schedule?.map(medicationDose),
    attrs.scheduleText?.trim() || null,
    attrs.unit?.trim() || null,
  ]);
}
