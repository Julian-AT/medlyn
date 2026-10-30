type CitationClaim = { text: string; segmentIds: string[] };
export type CitedRun = { start: number; text: string; segmentIds: string[] };

/** Attach citations only to an exact occurrence of an already validated claim. */
export function citedRuns(text: string, claims: CitationClaim[]): CitedRun[] {
  const runs: CitedRun[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const matches = claims
      .filter((claim) => claim.text.length > 0)
      .map((claim) => ({ claim, index: text.indexOf(claim.text, cursor) }))
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.index - b.index || b.claim.text.length - a.claim.text.length);
    const next = matches[0];
    if (!next) {
      runs.push({ start: cursor, text: text.slice(cursor), segmentIds: [] });
      break;
    }
    if (next.index > cursor)
      runs.push({ start: cursor, text: text.slice(cursor, next.index), segmentIds: [] });
    runs.push({
      start: next.index,
      text: next.claim.text,
      segmentIds: [...new Set(next.claim.segmentIds)],
    });
    cursor = next.index + next.claim.text.length;
  }
  return runs;
}
