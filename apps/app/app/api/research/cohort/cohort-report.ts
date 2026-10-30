import {
  label,
  list,
  number,
  record,
  text,
} from "../../../../components/research/report-values.ts";

export function cohortReport(manifestValue: unknown, samples: unknown[], scope: "full" | "sample") {
  const manifest = record(manifestValue);
  const distribution = (value: unknown) =>
    Object.entries(record(value)).flatMap(([name, value]) => {
      const total = number(value);
      return total === null ? [] : [{ label: label(name), count: total }];
    });
  const scenarios: Record<string, number> = {};
  for (const [family, value] of Object.entries(record(manifest.families))) {
    const scenario = family.split(":")[1] ?? family;
    scenarios[scenario] = (scenarios[scenario] ?? 0) + (number(value) ?? 0);
  }
  return {
    available: Object.keys(manifest).length > 0,
    scope,
    version: text(manifest.generatorVersion),
    counts: Object.fromEntries(
      Object.entries(record(manifest.counts)).map(([key, value]) => [key, number(value)]),
    ),
    splits: distribution(manifest.splits),
    mutations: distribution(manifest.mutationCounts),
    scenarios: distribution(scenarios),
    rewrittenPatients: number(manifest.rewrittenPatients),
    humanReviewed: manifest.humanGoldReview === true,
    samples: samples.map((value) => {
      const sample = record(value),
        patient = record(sample.patient),
        generation = record(sample.generation),
        labels = record(sample.labels);
      return {
        id: text(patient.id),
        name: text(patient.name),
        split: label(text(generation.split)),
        scenario: label(text(generation.scenario)),
        style: label(text(generation.style)),
        rewritten: generation.rewritten === true,
        documents: list(sample.documents).map((value) => {
          const metadata = record(record(value).metadata);
          return { id: text(metadata.id), title: text(metadata.title), date: text(metadata.date) };
        }),
        facts: list(labels.facts).map((value) => {
          const fact = record(value);
          return {
            id: text(fact.id),
            label: text(fact.labelEn),
            kind: label(text(fact.kind)),
            assertion: label(text(fact.assertion)),
            status: label(text(fact.temporalStatus)),
            documentId: text(fact.documentId),
          };
        }),
        gaps: list(labels.gaps).map((value) => text(record(value).concept)),
        mutations: list(generation.mutationTypes).map((value) => label(text(value))),
        contradictions: list(labels.contradictions).length,
      };
    }),
  };
}
export type CohortReport = ReturnType<typeof cohortReport>;
