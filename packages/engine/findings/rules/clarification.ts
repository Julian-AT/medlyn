import { candidate, lines, locate } from "../passages.ts";
import type { Candidate, FindingInput } from "../types.ts";

export function lymphNodeCandidates(input: FindingInput): Candidate[] {
  const positive = input.documents.flatMap((d) => lines(d)
    .filter((l) => /vergrößerte[nr]?\s+Lymphknoten/i.test(l.text) && /axillär/i.test(l.text)
      && !/keine\s+vergrößerten/i.test(l.text))
    .flatMap((l) => locate(input, d, l.start, l.end,
      /rechts/i.test(l.text) ? "Enlarged right axillary lymph nodes are described." : "Enlarged axillary lymph nodes are described.",
      /Lymphknoten/i)));
  const negative = input.documents.flatMap((d) => lines(d)
    .filter((l) => /keine\s+vergrößerten\s+Lymphknoten/i.test(l.text) && /axillär/i.test(l.text))
    .flatMap((l) => locate(input, d, l.start, l.end, "Ultrasound describes no enlarged axillary lymph nodes, without stating a side.")));
  if (!positive.length || !negative.length) return [];
  const staging = input.documents.filter((d) => /Entnahmedatum\s*:/i.test(d.normText)).flatMap((d) => {
    const match = d.normText.match(/\(T\d\s+N0\s+M\d[^)]*\)/);
    return match ? locate(input, d, match.index!, match.index! + match[0].length,
      "The pathology summary records N0 in the TNM classification.") : [];
  });
  return [candidate("lymph_nodes", "Axillary lymph nodes need clarification", "Palpation described enlarged right axillary nodes; later ultrasound described no enlarged axillary nodes without stating a side, and pathology records N0. Different dates and examinations prevent a qualifying contradiction.", [...positive, ...negative, ...staging], {
    type: "needs_clarification", hypothesisText: "Different examination methods, dates or sides may explain the descriptions; this remains an open finding.",
  })];
}

export function caseIdCandidates(input: FindingInput): Candidate[] {
  const output: Candidate[] = [];
  const pathologies = input.documents.filter((d) => /Entnahmedatum\s*:/i.test(d.normText));
  for (const pathology of pathologies) {
    const id = pathology.normText.match(/\bFall:\s*(\d+)/);
    const summary = lines(pathology).find((l) => /Stanzbiopsie/i.test(l.text) && /\bT\d\s+N\d\s+M\d/.test(l.text));
    if (!id || !summary) continue;
    for (const letter of input.documents) {
      if (letter.doc.id === pathology.doc.id || !letter.normText.includes(summary.text.trim())) continue;
      const other = letter.normText.match(/\bFall:\s*(\d+)/);
      if (!other || other[1] === id[1]) continue;
      output.push(candidate("case_id", "Case identifiers need clarification", "The pathology report and the letter that repeats its biopsy summary carry different case identifiers. The sources do not establish that these identifiers have the same scope.", [
        ...locate(input, pathology, id.index!, id.index! + id[0].length, `The pathology report carries case identifier ${id[1]}.`),
        ...locate(input, letter, other.index!, other.index! + other[0].length, `The discharge letter carries case identifier ${other[1]}.`),
      ], { type: "needs_clarification", severity: "low", hypothesisText: "The identifiers may belong to different administrative scopes; no shared scope is established." }));
    }
  }
  return output;
}
