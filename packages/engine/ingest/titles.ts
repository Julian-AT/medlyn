const TITLES: [RegExp, string][] = [
  [/Stat\. Patientenbrief/i, "Inpatient discharge letter (internal medicine)"],
  [/Ambulanter Patientenbrief/i, "Outpatient letter"],
  [/24h-RR-Messung/i, "24-hour blood pressure monitoring"],
  [/Langzeit-EKG/i, "Holter ECG"],
  [/Konsil für Augenheilkunde|Augenkonsil/i, "Ophthalmology consultation"],
  [/Radiologischer Befund/i, "Radiology report"],
  [/Histologie|Histopathologischer|HistoBefund/i, "Histopathology report"],
];

export function titleEn(title: string, docType = ""): string {
  return TITLES.find(([pattern]) => pattern.test(title) || pattern.test(docType))?.[1] ?? "Clinical report";
}
