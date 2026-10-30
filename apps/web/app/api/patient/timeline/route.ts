import { isShowable, validateClaims } from "@medlyn/engine/claims/validate";
import { renderLine } from "@medlyn/engine/lens/templates";
import { loadFacts, loadSegments } from "@medlyn/engine/store";
import { patientError, patientHeaders, patientRequest } from "../request.ts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const { patientId, window, kinds } = await patientRequest(request);
    const [facts, segments] = await Promise.all([
      loadFacts(window, kinds, patientId),
      loadSegments(window, patientId),
    ]);
    const ctx = { patientId, window, facts, segments };
    const claims = await validateClaims(
      facts.map((fact) => renderLine(fact, ctx)),
      ctx,
    );
    const byFact = new Map(claims.filter(isShowable).map((claim) => [claim.factIds[0], claim]));
    const points = facts
      .flatMap((fact) => {
        const claim = byFact.get(fact.id);
        return claim
          ? [
              {
                date: fact.eventDate ?? fact.docDate,
                datePrecision: fact.datePrecision,
                factId: fact.id,
                segmentId: fact.segmentId,
                claim,
              },
            ]
          : [];
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.factId.localeCompare(b.factId));
    return Response.json({ window, points }, { headers: patientHeaders });
  } catch (error) {
    return patientError(error);
  }
}
