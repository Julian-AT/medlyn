import { labUiPoints, measurementKey } from "@medlyn/engine/agent/ui-tools";
import type { ClaimLine, Fact } from "@medlyn/engine/contracts";

type Row = { fact: Fact; claim: ClaimLine };

/** Group checked rows without removing history, source identity or independent assertion states. */
export function categoryProjections(rows: Row[]) {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const { fact } = row;
    const measurement = ["measurement", "lab"].includes(fact.kind);
    const entity = measurement
      ? measurementKey(fact)
      : (fact.entityId ?? fact.labelEn.toLowerCase());
    const temporalGroup =
      measurement && !["planned", "recommended"].includes(fact.temporalStatus)
        ? "observed"
        : fact.temporalStatus;
    const key = JSON.stringify([
      measurement ? "measurement" : fact.kind,
      entity,
      fact.assertion,
      temporalGroup,
    ]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups].map(([key, group]) => {
    const history = [...group].sort(
      (a, b) =>
        (b.fact.eventDate ?? b.fact.docDate).localeCompare(a.fact.eventDate ?? a.fact.docDate) ||
        b.fact.docDate.localeCompare(a.fact.docDate) ||
        a.fact.id.localeCompare(b.fact.id),
    );
    const latestDate = history[0].fact.eventDate ?? history[0].fact.docDate;
    const lines = history.map(({ fact, claim }) => ({
      factId: fact.id,
      segmentId: fact.segmentId,
      documentId: fact.documentId,
      quote: fact.quote,
      line: claim,
    }));
    return {
      key,
      entityId: history[0].fact.entityId,
      latest: history[0],
      latestRows: history.filter(({ fact }) => (fact.eventDate ?? fact.docDate) === latestDate),
      history,
      sourceCount: new Set(history.map(({ fact }) => fact.documentId)).size,
      points: ["lab", "measurement"].includes(history[0].fact.kind)
        ? labUiPoints(
            history.map(({ fact }) => fact),
            lines,
            measurementKey(history[0].fact),
          )
        : [],
    };
  });
}
