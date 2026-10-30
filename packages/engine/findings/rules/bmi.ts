import { candidate, locate } from "../passages.ts";
import type { Candidate, FindingInput } from "../types.ts";

export function bmiInterval(heightCm: number, weightKg: number): [number, number] {
  return [
    (weightKg - 0.5) / ((heightCm + 0.5) / 100) ** 2,
    (weightKg + 0.5) / ((heightCm - 0.5) / 100) ** 2,
  ];
}

export function bmiCandidates(input: FindingInput): Candidate[] {
  const output: Candidate[] = [];
  for (const document of input.documents) {
    const heights = [
      ...document.normText.matchAll(/(?:Größe|Körpergröße|height)\s*:\s*(\d+(?:[.,]\d+)?)\s*cm/gi),
    ];
    const weights = [
      ...document.normText.matchAll(/(?:Gewicht|weight)\s*:\s*(\d+(?:[.,]\d+)?)\s*kg/gi),
    ];
    const bmis = [...document.normText.matchAll(/\bBMI\s*:\s*(\d+(?:[.,]\d+)?)/gi)];
    for (const bmi of bmis) {
      const height = heights.filter((m) => m.index < bmi.index && bmi.index - m.index < 250).at(-1);
      const weight = weights.filter((m) => m.index < bmi.index && bmi.index - m.index < 250).at(-1);
      if (!height || !weight) continue;
      const h = Number(height[1].replace(",", "."));
      const w = Number(weight[1].replace(",", "."));
      const stated = Number(bmi[1].replace(",", "."));
      if (h <= 0.5 || w <= 0.5) continue;
      const [low, high] = bmiInterval(h, w);
      const decimals = bmi[1].split(/[.,]/)[1]?.length ?? 0;
      const tolerance = 0.5 * 10 ** -decimals;
      if (stated + tolerance >= low && stated - tolerance <= high) continue;
      const passages = [height, weight, bmi].flatMap((match, index) =>
        locate(
          input,
          document,
          match.index,
          match.index + match[0].length,
          [
            `Height recorded as ${h} cm.`,
            `Weight recorded as ${w} kg.`,
            `BMI recorded as ${stated}.`,
          ][index],
        ),
      );
      output.push(
        candidate(
          "bmi",
          "BMI arithmetic",
          "The BMI stated alongside the height and weight is outside the range allowed by rounding those measurements by ±0.5 cm and ±0.5 kg.",
          passages,
          {
            deterministic: true,
            computation: `${w} / ${(h / 100).toFixed(2)}² = ${(w / (h / 100) ** 2).toFixed(1)} (${low.toFixed(1)}–${high.toFixed(1)} with rounding) vs stated ${stated}`,
          },
        ),
      );
    }
  }
  return output;
}
