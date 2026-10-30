import type { ClaimLine, Fact } from "@medlyn/engine/contracts";

const normalise = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, stable(item)]),
  );
}

export function evidenceKey(line: ClaimLine, fact?: Fact): string {
  const sourceStart = line.text.lastIndexOf(" · ");
  const text = normalise(sourceStart < 0 ? line.text : line.text.slice(0, sourceStart));
  if (line.kind !== "template" || line.factIds.length !== 1) return line.id;
  const identity = fact?.entityId || normalise(fact?.labelEn ?? text);
  const attrs = fact
    ? Object.fromEntries(
        Object.entries(fact.attrs).filter(
          ([key]) => !["sourceTitle", "sourceLabel", "listLabel"].includes(key),
        ),
      )
    : {};
  return JSON.stringify([
    identity,
    fact?.kind,
    text,
    stable(attrs),
    line.assertion,
    line.temporalStatus,
    fact &&
    ![
      "allergy",
      "diagnosis",
      "medication",
      "social_history",
      "family_history",
      "demographic",
    ].includes(fact.kind)
      ? (fact.eventDate ?? fact.docDate)
      : null,
  ]);
}

export function groupEvidence<T>(
  items: T[],
  lineOf: (item: T) => ClaimLine,
  factOf: (item: T) => Fact | undefined,
  groupingValue?: (item: T) => unknown,
) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const line = lineOf(item);
    if (!["supported", "exempt"].includes(line.validation.support)) continue;
    const key = JSON.stringify([evidenceKey(line, factOf(item)), stable(groupingValue?.(item))]);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => {
      const left = factOf(a)?.docDate ?? lineOf(a).asOf ?? "";
      const right = factOf(b)?.docDate ?? lineOf(b).asOf ?? "";
      return right.localeCompare(left) || lineOf(a).id.localeCompare(lineOf(b).id);
    });
    return { item: ordered[0], sources: ordered };
  });
}
