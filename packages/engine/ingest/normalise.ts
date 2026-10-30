const ENTITIES: Record<string, string> = {
  gt: ">", lt: "<", quot: '"', apos: "'", nbsp: " ", amp: "&",
  auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü", szlig: "ß",
  deg: "°", micro: "µ", frac12: "½", frac14: "¼", frac34: "¾", ndash: "–", mdash: "—",
};
const TOKEN = /<br\s*\/?>|&(?:#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi;

function replacement(token: string): string {
  if (token.startsWith("<")) return "\n";
  const entity = token.slice(1, -1);
  if (!entity.startsWith("#")) return ENTITIES[entity] ?? token;
  const hex = /^#x/i.test(entity);
  const point = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
  return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : token;
}

/**
 * `<BR>` becomes a newline and entities are decoded. `offsetMap[i]` is the raw offset of
 * normalised character `i`, with one trailing entry for the end of the text.
 */
export function normalise(raw: string): { text: string; offsetMap: number[] } {
  let text = "";
  const offsetMap: number[] = [];
  let last = 0;
  for (const match of raw.matchAll(TOKEN)) {
    for (let i = last; i < match.index; i++) offsetMap.push(i);
    text += raw.slice(last, match.index);
    const decoded = replacement(match[0]);
    text += decoded;
    for (let i = 0; i < decoded.length; i++) offsetMap.push(decoded === match[0] ? match.index + i : match.index);
    last = match.index + match[0].length;
  }
  for (let i = last; i < raw.length; i++) offsetMap.push(i);
  text += raw.slice(last);
  offsetMap.push(raw.length);
  return { text, offsetMap };
}
