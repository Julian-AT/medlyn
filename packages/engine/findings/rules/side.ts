import { candidate, lines, locate } from "../passages.ts";
import type { Candidate, CorpusInputDocument, FindingInput } from "../types.ts";

type Line = { start: number; end: number; text: string };

function sameExam(document: CorpusInputDocument, right: Line, assessment: Line, low: Line): boolean {
  const headings = document.segments.filter((segment) => segment.kind === "heading");
  const block = (line: Line) => headings.filter((heading) => heading.start <= line.start).at(-1);
  const exam = block(right);
  const summary = block(assessment);
  if (!exam || !/carotis|carotid|halsarterien/i.test(exam.text) || block(low)?.start !== exam.start) return false;
  if (summary?.start !== exam.start) {
    const next = headings.find((heading) => heading.start > exam.start);
    if (!summary || next?.start !== summary.start || !/Gesamtbeurteilung|Zusammenfassung|Assessment/i.test(summary.text)) return false;
  }
  if (assessment.start <= right.start) return false;
  const range = document.normText.slice(exam.start, assessment.end);
  const dates = new Set([...range.matchAll(/\b\d{1,2}[./]\d{1,2}[./]\d{4}\b/g)].map((match) => match[0].replaceAll("/", ".")));
  const examinations = [...range.matchAll(/(?:Untersuchung|Examination|Exam)\s*(?:am|vom|on|:|\d)/gi)];
  return dates.size <= 1 && examinations.length <= 1;
}

export function sideCandidates(input: FindingInput): Candidate[] {
  const output: Candidate[] = [];
  for (const document of input.documents) {
    const documentLines = lines(document);
    const severe = documentLines.filter((l) => /carotis|carotid/i.test(l.text) && /\d+\s*%/.test(l.text));
    const rightLines = severe.filter((l) => /^\s*Rechts\b/i.test(l.text));
    const left = severe.filter((l) => /(?:links|\bli\.)/i.test(l.text));
    if (!rightLines.length || !left.length) continue;
    const percent = rightLines[0].text.match(/(\d+)\s*%/)?.[1];
    const percentPattern = new RegExp(`(?<!\\d)${percent}\\s*%`);
    const right = rightLines.filter((line) => line.text.match(/(\d+)\s*%/)?.[1] === percent);
    const matchingLeft = left.filter((l) => /^\s*(?:Carotis|Maximal)/i.test(l.text) && percentPattern.test(l.text));
    const lowLeft = documentLines.filter((l) => /link/i.test(l.text) && /Plaque/i.test(l.text)
      && /ohne\s+hämodynamische/i.test(l.text));
    if (!matchingLeft.length || !lowLeft.length) continue;
    const established = right.some((r) => matchingLeft.some((l) => lowLeft.some((low) => sameExam(document, r, l, low))));
    const ownPassages = [
      ...right.flatMap((l) => locate(input, document, l.start, l.end,
        "The detailed finding describes right internal carotid narrowing.").map((p) => percentPattern.test(p.quote)
        ? { ...p, claimEn: /Rechts/i.test(p.quote) ? `Right internal carotid narrowing is quantified at about ${percent}%.`
          : `The narrowing is quantified at about ${percent}%.` } : p)),
      ...matchingLeft.flatMap((l) => locate(input, document, l.start, l.end,
        `The diagnosis or assessment places ${percent}% carotid stenosis on the left.`, percentPattern)),
      ...lowLeft.flatMap((l) => locate(input, document, l.start, l.end,
        "The left carotid plaques are described as having no haemodynamic effect.", /Plaque/i)),
    ];
    const corroboration = input.documents.filter((d) => d.doc.id !== document.doc.id).flatMap((d) =>
      lines(d).filter((l) => /^\s*Links\b/i.test(l.text) && /carotis/i.test(l.text)
        && percentPattern.test(l.text)).flatMap((l) => locate(input, d, l.start, l.end,
        "The separate carotid report describes left internal carotid narrowing.")
        .filter((p) => /^\s*Links\b/i.test(p.quote) || percentPattern.test(p.quote))
        .map((p) => percentPattern.test(p.quote) ? { ...p, claimEn: /Links/i.test(p.quote)
          ? `Left internal carotid narrowing is quantified at about ${percent}%.`
          : `The narrowing is quantified at about ${percent}%.` } : p)));
    output.push(candidate("side", "Carotid stenosis side", "The carotid examination describes right-sided stenosis and left-sided plaques without a haemodynamic effect; its assessment places the stenosis on the left.", [...ownPassages, ...corroboration], {
      severity: "high", deterministic: established,
    }));
  }
  return output;
}
