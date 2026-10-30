import type { Need } from "../contracts.ts";

const LABELS: Record<string, string> = {
  date: "Date",
  value: "Value",
  unit: "Unit",
  er: "Oestrogen receptor",
  pr: "Progesterone receptor",
  her2: "HER2",
  ki67: "Ki-67",
  tnm: "TNM stage",
  sle: "SLE",
  ejection_fraction: "Ejection fraction",
  prior_contrast_avoidance: "Prior contrast avoidance",
  completion_evidence: "Completion evidence",
  kidney_function: "Kidney function",
  due_date: "Due date",
  follow_up: "Follow-up",
  sleep_apnoea: "Sleep apnoea",
};

export function missingFieldLabels(need: Need, fields: string[]): string[] {
  return [...new Set(fields)]
    .filter((field) => need.requiredFields?.includes(field))
    .map((field) => LABELS[field] ?? field[0].toUpperCase() + field.slice(1).replaceAll("_", " "));
}
