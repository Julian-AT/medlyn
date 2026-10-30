import type { Fact } from "../contracts.ts";

export function matchingFacts(facts: Fact[], query: string): Fact[] {
  const tokens = normalise(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return facts.filter((fact) => {
    const text = normalise(`${fact.entityId ?? ""} ${fact.kind} ${fact.labelEn} ${JSON.stringify(fact.attrs)} ${fact.quote}`);
    return tokens.every((token) => text.includes(token));
  });
}

export function normalise(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ß/g, "ss");
}

/** Knowledge time is enforced by the shared window; event dates may be later. */
export function timelinePoints(facts: Fact[], query: string) {
  return matchingFacts(facts, query)
    .map((fact) => ({
      date: fact.eventDate ?? fact.docDate,
      text: `${fact.labelEn} · ${fact.assertion} · ${fact.temporalStatus}`,
      factId: fact.id,
      segmentId: fact.segmentId,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.factId.localeCompare(b.factId));
}
