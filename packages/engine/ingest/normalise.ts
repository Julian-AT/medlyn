const REPLACEMENTS: [RegExp, string][] = [
  [/<BR>/gi, "\n"],
  [/&gt;/g, ">"],
  [/&lt;/g, "<"],
  [/&quot;/g, '"'],
  [/&#39;/g, "'"],
  [/&nbsp;/g, " "],
  [/&amp;/g, "&"],
];

const TOKEN = new RegExp(REPLACEMENTS.map(([re]) => re.source).join("|"), "gi");

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
    const [, replacement] = REPLACEMENTS.find(([re]) => new RegExp(`^${re.source}$`, "i").test(match[0]))!;
    text += replacement;
    offsetMap.push(match.index);
    last = match.index + match[0].length;
  }
  for (let i = last; i < raw.length; i++) offsetMap.push(i);
  text += raw.slice(last);
  offsetMap.push(raw.length);
  return { text, offsetMap };
}
