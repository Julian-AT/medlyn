import { candidate, lines, locate } from "../passages.ts";
import type { Candidate, FindingInput } from "../types.ts";

const DATE = /\b(\d{1,2})[./](\d{1,2})[./](\d{4,5})\b/;
function dateKey(text: string): string | null {
  const match = text.match(DATE);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : null;
}

export function restatedDateCandidates(input: FindingInput): Candidate[] {
  return input.documents.flatMap((document) => {
    const discharge = lines(document).filter((l) => /entlassen/i.test(l.text) && DATE.test(l.text));
    const header = discharge.find((l) => /Entlassen\s+am/i.test(l.text));
    const restated = discharge.find((l) => /nach Hause entlassen/i.test(l.text));
    if (!header || !restated) return [];
    const headerDischarge = header.text.slice(header.text.search(/Entlassen\s+am/i));
    const a = dateKey(headerDischarge);
    const b = dateKey(restated.text);
    if (!a || !b || a === b) return [];
    const headerStart = header.start + header.text.indexOf(headerDischarge);
    return [candidate("restated_date", "Discharge date restated inconsistently", "The header and narrative state different dates for the same discharge. The malformed year is almost certainly a typographical error.", [
      ...locate(input, document, headerStart, header.end, `The discharge header states ${a}.`),
      ...locate(input, document, restated.start, restated.end, `The narrative states discharge home on ${b}.`, /nach Hause entlassen/i),
    ], { deterministic: true, severity: "low", hypothesisText: "The malformed year may be a typographical error; the source has not been corrected." })];
  });
}

export function admissionCandidates(input: FindingInput): Candidate[] {
  return input.documents.flatMap((document) => {
    const documentLines = lines(document);
    const header = documentLines.find((l) => /Aufnahme\s+am/i.test(l.text));
    const ward = documentLines.find((l) => /auf\s+der\s+Station\s+aufgenommen/i.test(l.text));
    const headerDate = header && dateKey(header.text);
    const wardDate = ward && dateKey(ward.text);
    if (!header || !ward || !headerDate || !wardDate || headerDate === wardDate) return [];
    const headerEnd = header.text.indexOf("|");
    const passages = [
      ...locate(input, document, header.start, headerEnd < 0 ? header.end : header.start + headerEnd,
        `The admission header states ${headerDate}.`),
      ...locate(input, document, ward.start, ward.end, `Ward admission is described as ${wardDate}.`, /auf\s+der\s+Station\s+aufgenommen/i),
      ...input.documents.flatMap((d) => lines(d)
        .filter((l) => /Aufnahme/i.test(l.text) && /terminisiert/i.test(l.text) && dateKey(l.text) === headerDate)
        .flatMap((l) => locate(input, d, l.start, l.end, `Admission was scheduled for ${headerDate}.`, /terminisiert/i))),
    ];
    return [candidate("admission_date", "Admission dates need clarification", "The admission header and planned admission use one date, while the ward narrative uses another. The documents do not establish whether these describe hospital and ward admission separately.", passages, {
      type: "needs_clarification", hypothesisText: "Hospital admission and ward admission may have occurred on different dates; this is not established.",
    })];
  });
}

/** A shared verbatim histology summary and TNM establish that the collection dates refer to one biopsy. */
export function biopsyDateCandidates(input: FindingInput): Candidate[] {
  const output: Candidate[] = [];
  for (const pathology of input.documents) {
    const pathologyLines = lines(pathology);
    const collected = pathologyLines.find((l) => /Entnahmedatum\s*:/i.test(l.text));
    const summary = pathologyLines.find((l) => /Stanzbiopsie/i.test(l.text) && /\bT\d\s+N\d\s+M\d/.test(l.text));
    if (!collected || !summary) continue;
    for (const letter of input.documents) {
      if (letter.doc.id === pathology.doc.id) continue;
      const letterLines = lines(letter);
      const repeated = letterLines.find((l) => l.text.includes(summary.text.trim()));
      const ultrasound = letterLines.find((l) => /Ultraschalluntersuchung.*Brust.*vom/i.test(l.text));
      const biopsy = letterLines.find((l) => /ultraschallgezielte\s+Biopsie/i.test(l.text));
      const histology = letterLines.find((l) => /Histologie\s+vom/i.test(l.text));
      const collectedDate = dateKey(collected.text);
      const biopsyDate = ultrasound && dateKey(ultrasound.text);
      if (!repeated || !ultrasound || !biopsy || !histology || !collectedDate || !biopsyDate || collectedDate === biopsyDate) continue;
      output.push(candidate("same_event_date", "Biopsy collection date", "The pathology report and the ultrasound-guided biopsy account state different collection dates for the same biopsy. The dated histology section repeats the pathology summary and TNM verbatim, establishing that the accounts refer to the same specimen.", [
        ...locate(input, pathology, collected.start, collected.end, `Pathology records specimen collection on ${collectedDate}.`),
        ...locate(input, pathology, summary.start, summary.end, "The pathology summary identifies the breast core biopsy and its TNM."),
        ...locate(input, letter, ultrasound.start, ultrasound.end, `The breast ultrasound is dated ${biopsyDate}.`),
        ...locate(input, letter, biopsy.start, biopsy.end, "Ultrasound-guided biopsy is described in this examination.", /ultraschallgezielte\s+Biopsie/i),
        ...locate(input, letter, histology.start, histology.end, `The letter dates the histology ${dateKey(histology.text)}.`),
        ...locate(input, letter, repeated.start + repeated.text.indexOf(summary.text.trim()),
          repeated.start + repeated.text.indexOf(summary.text.trim()) + summary.text.trim().length,
          "The letter repeats the pathology summary and TNM for the same core biopsy."),
      ]));
    }
  }
  return output;
}
