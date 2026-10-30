const TRANSLATIONS: Record<string, string> = {
  etwa: "about",
  circa: "about",
  ungefähr: "about",
  ungefaehr: "about",
  bis: "up to",
  mindestens: "at least",
  höchstens: "at most",
  hoechstens: "at most",
  stunde: "hour",
  stunden: "hours",
  minute: "minute",
  minuten: "minutes",
  sekunde: "second",
  sekunden: "seconds",
  tag: "day",
  tage: "days",
  tagen: "days",
  woche: "week",
  wochen: "weeks",
  monat: "month",
  monate: "months",
  monaten: "months",
  jahr: "year",
  jahre: "years",
  jahren: "years",
  täglich: "daily",
  taeglich: "daily",
  prozent: "%",
  kilogramm: "kg",
  gramm: "g",
  milligramm: "mg",
  zentimeter: "cm",
  millimeter: "mm",
  liter: "L",
  milliliter: "mL",
  blutdruck: "blood pressure",
  gewicht: "weight",
  körpergewicht: "body weight",
  koerpergewicht: "body weight",
  größe: "height",
  grösse: "height",
  grosse: "height",
  groesse: "height",
  puls: "pulse",
  systolisch: "systolic",
  systolische: "systolic",
  systolischer: "systolic",
  diastolisch: "diastolic",
  diastolische: "diastolic",
  diastolischer: "diastolic",
  links: "left",
  rechts: "right",
  beidseits: "bilateral",
  und: "and",
  oder: "or",
  sowie: "and",
  mit: "with",
  ohne: "without",
  bei: "with",
  für: "for",
  fuer: "for",
  seit: "since",
  nach: "after",
  vor: "before",
  von: "of",
  vom: "of",
  zum: "to",
  zur: "to",
  auf: "on",
  über: "over",
  ueber: "over",
  unter: "under",
  nicht: "not",
  kein: "no",
  keine: "no",
  keinen: "no",
  keinem: "no",
  keiner: "no",
  der: "the",
  die: "the",
  das: "the",
  dem: "the",
  den: "the",
  des: "the",
  ein: "a",
  eine: "a",
  einer: "a",
  einem: "a",
  einen: "a",
};

// Unicode boundaries keep abbreviations, unit symbols and brand names intact.
const WORD = /[\p{L}]+/gu;
export const GERMAN_LABEL_TOKENS = Object.keys(TRANSLATIONS).filter(
  (token) => TRANSLATIONS[token] !== token,
);
const germanTokens = new Set(GERMAN_LABEL_TOKENS);

export function germanLabelTokens(label: string): string[] {
  return [...new Set((label.match(WORD) ?? []).map((word) => word.toLowerCase()))].filter((word) =>
    germanTokens.has(word),
  );
}

/** Translate common label fragments only; source quotes and clinical attributes stay unchanged. */
export function normaliseLabel(label: string): string {
  return label
    .normalize("NFC")
    .replace(WORD, (word) => TRANSLATIONS[word.toLowerCase()] ?? word)
    .replace(/\s+%/g, "%")
    .replace(/\s+/g, " ")
    .trim();
}
