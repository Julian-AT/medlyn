import { candidate, lines, locate } from "../passages.ts";
import type { Candidate, FindingInput } from "../types.ts";

export function sideCandidates(input: FindingInput): Candidate[] {
  const output: Candidate[] = [];
  for (const document of input.documents) {
    const documentLines = lines(document);
    const severe = documentLines.filter((l) => /carotis|carotid/i.test(l.text) && /\d+\s*%/.test(l.text));
    const right = severe.filter((l) => /^\s*Rechts\b/i.test(l.text));
    const left = severe.filter((l) => /(?:links|\bli\.)/i.test(l.text));
    if (!right.length || !left.length) continue;
    const percent = right[0].text.match(/(\d+)\s*%/)?.[1];
    const matchingLeft = left.filter((l) => /^\s*(?:Carotis|Maximal)/i.test(l.text) && l.text.includes(`${percent}%`));
    const lowLeft = documentLines.filter((l) => /link/i.test(l.text) && /Plaque/i.test(l.text)
      && /ohne\s+hämodynamische/i.test(l.text));
    if (!matchingLeft.length || !lowLeft.length) continue;
    const ownPassages = [
      ...right.flatMap((l) => locate(input, document, l.start, l.end,
        "The detailed finding describes right internal carotid narrowing.").map((p) => /\d+\s*%/.test(p.quote)
        ? { ...p, claimEn: /Rechts/i.test(p.quote) ? `Right internal carotid narrowing is quantified at about ${percent}%.`
          : `The narrowing is quantified at about ${percent}%.` } : p)),
      ...matchingLeft.flatMap((l) => locate(input, document, l.start, l.end,
        `The diagnosis or assessment places ${percent}% carotid stenosis on the left.`, /\d+\s*%/)),
      ...lowLeft.flatMap((l) => locate(input, document, l.start, l.end,
        "The left carotid plaques are described as having no haemodynamic effect.", /Plaque/i)),
    ];
    const corroboration = input.documents.filter((d) => d.doc.id !== document.doc.id).flatMap((d) =>
      lines(d).filter((l) => /^\s*Links\b/i.test(l.text) && /carotis/i.test(l.text)
        && l.text.includes(`${percent}%`)).flatMap((l) => locate(input, d, l.start, l.end,
        "The separate carotid report describes left internal carotid narrowing.")
        .filter((p) => /^\s*Links\b/i.test(p.quote) || /\d+\s*%/.test(p.quote))
        .map((p) => /\d+\s*%/.test(p.quote) ? { ...p, claimEn: /Links/i.test(p.quote)
          ? `Left internal carotid narrowing is quantified at about ${percent}%.`
          : `The narrowing is quantified at about ${percent}%.` } : p)));
    output.push(candidate("side", "Carotid stenosis side", "Within the same carotid examination, the detailed finding places the stenosis on the right and describes only minor left-sided plaques, while the diagnosis and overall assessment place the stenosis on the left.", [...ownPassages, ...corroboration], {
      severity: "high", deterministic: true,
    }));
  }
  return output;
}
