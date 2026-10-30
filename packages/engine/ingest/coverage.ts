import { pathToFileURL } from "node:url";
import type { Fact } from "../contracts.ts";
import { evidenceWindow, loadFacts } from "../store.ts";
import { checkedTokens } from "./locate.ts";
import { type ConceptHint, loadConceptHints } from "./recall.ts";

function normal(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^a-z0-9.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SCORE_TERMS: Record<string, string[]> = {
  birads: ["bi rads", "birads"],
  blutdruck: ["blood pressure", "rr", "bp", "systolic", "diastolic"],
  "body mass index": ["bmi", "body mass"],
  ejektionsfraktion: ["lvef", "ef", "ejection", "systolic"],
  gewicht: ["weight", "gewicht"],
  korpergewicht: ["weight", "gewicht"],
  grosse: ["height", "grosse"],
  korpergrosse: ["height", "grosse"],
  herzfrequenz: ["heart rate", "pulse", "frequency", "herzfrequenz", "hf"],
  puls: ["pulse", "heart rate", "hf"],
  temperatur: ["temperature", "temperatur"],
  korpertemperatur: ["temperature", "temperatur"],
  "mini mental state examination": ["mmse", "mini mental"],
  "pulmonalarterieller druck": ["pulmonary", "pulmonal", "pap", "systolic pulmonary"],
  hba1c: ["hba1c", "glycated"],
  "ki67 proliferationsrate": ["ki 67", "ki67"],
};

export function hintCovered(hint: ConceptHint, facts: Fact[]): boolean {
  const candidates = facts.filter((fact) => fact.documentId === hint.documentId);
  const compact = (text: string) => normal(text).replace(/[^a-z0-9]/g, "");
  if (hint.source === "scores-all") {
    const name = normal(hint.name);
    const terms = SCORE_TERMS[name] ?? [name];
    const values = (hint.value ?? "").split(/[|/]/).map(normal).filter(Boolean);
    return candidates.some((fact) => {
      if (!["measurement", "lab", "imaging", "receptor", "staging"].includes(fact.kind))
        return false;
      const meaning = normal(`${fact.labelEn} ${JSON.stringify(fact.attrs)}`);
      const passage = normal(fact.quote);
      const conceptMatches = terms.some((term) => meaning.includes(term) || passage.includes(term));
      if (!conceptMatches || !values.length) return false;
      if (
        name === "grosse" &&
        hint.unit === "m" &&
        fact.attrs.unit === "cm" &&
        Number(String(fact.attrs.value).replace(",", ".")) / 100 === Number(values[0])
      )
        return true;
      if (name === "birads") {
        const roman = passage.match(/\b(?:bi rads|birads)\s+(i|ii|iii|iv|v|vi)\b/)?.[1];
        const categories = ["", "i", "ii", "iii", "iv", "v", "vi"];
        if (roman && categories.indexOf(roman) === Number(values[0])) return true;
      }
      return values.every((value) =>
        new RegExp(`(?:^|[^0-9.])${value.replace(/\./g, "\\.")}(?:$|[^0-9.])`).test(passage),
      );
    });
  }
  const text = normal(hint.text);
  const tokens = [
    ...new Set(
      text
        .split(" ")
        .filter(
          (t) =>
            t.length > 2 &&
            ![
              "der",
              "die",
              "das",
              "und",
              "mit",
              "von",
              "bei",
              "des",
              "dem",
              "den",
              "zur",
              "zum",
              "ein",
              "eine",
            ].includes(t),
        ),
    ),
  ];
  const kinds =
    hint.source === "diagnoses"
      ? [
          "diagnosis",
          "allergy",
          "symptom",
          "event",
          "histology",
          "staging",
          "imaging",
          "measurement",
          "lab",
          "receptor",
          "family_history",
        ]
      : hint.source === "procedures"
        ? [
            "procedure",
            "recommendation",
            "imaging",
            "event",
            "lab",
            "medication",
            "diagnosis",
            "histology",
          ]
        : ["medication"];
  const eligible = candidates.filter((fact) => kinds.includes(fact.kind));
  if (
    hint.source === "procedures" &&
    text === "labor" &&
    eligible.some((fact) => fact.kind === "lab")
  )
    return true;
  return eligible.some((fact) => {
    const quote = normal(fact.quote);
    const sourceTokens = new Set(checkedTokens({ quote: fact.quote }));
    if (
      !checkedTokens({ hint: hint.text.replace(/<[^>]*>/g, "") }).every((token) =>
        sourceTokens.has(token),
      )
    )
      return false;
    if ((quote.includes(text) || compact(quote).includes(compact(text))) && text.length > 2)
      return true;
    if (hint.source === "medication") return false;
    const present = tokens.filter((token) => quote.includes(token)).length;
    return tokens.length > 0 && present / tokens.length >= 0.8;
  });
}

export function conceptCoverage(hints: ConceptHint[], facts: Fact[]) {
  const unique = [
    ...new Map(
      hints.map((h) => [JSON.stringify([h.source, h.documentId, h.text, h.value]), h]),
    ).values(),
  ];
  const missing = unique.filter((hint) => !hintCovered(hint, facts));
  return {
    total: unique.length,
    covered: unique.length - missing.length,
    percentage: unique.length ? (100 * (unique.length - missing.length)) / unique.length : 100,
    missing,
  };
}

export function printCoverage(hints: ConceptHint[], facts: Fact[]) {
  const result = conceptCoverage(hints, facts);
  for (const hint of result.missing)
    console.log(
      JSON.stringify({
        type: "coverage_missing",
        source: hint.source,
        documentId: hint.documentId,
        concept: hint.name,
        value: hint.value,
      }),
    );
  console.log(
    JSON.stringify({
      type: "coverage",
      total: result.total,
      covered: result.covered,
      percentage: Number(result.percentage.toFixed(2)),
    }),
  );
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const facts = await loadFacts(await evidenceWindow());
  printCoverage(loadConceptHints(), facts);
}
