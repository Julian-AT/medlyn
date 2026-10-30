import "server-only";
import { isShowable, validateClaims } from "@medlyn/engine/claims/validate";
import { renderLine, withDocumentTitles } from "@medlyn/engine/lens/templates";
import { evidenceWindow, loadDocuments, loadFacts, loadSegments } from "@medlyn/engine/store";
import { cache } from "react";
import { activePatientId } from "@/lib/patient-server";
export const patientData = cache(async (requestedPatientId?: string, asOf?: string) => {
  const patientId = requestedPatientId ?? (await activePatientId());
  const window = await evidenceWindow(asOf, patientId);
  const [documents, rawFacts, segments] = await Promise.all([
    loadDocuments(window, patientId),
    loadFacts(window, undefined, patientId),
    loadSegments(window, patientId),
  ]);
  const facts = withDocumentTitles(rawFacts, documents);
  const ctx = { patientId, window, facts, segments };
  const claims = await validateClaims(
    facts.map((fact) => renderLine(fact, ctx)),
    ctx,
  );
  const supported = new Map(claims.filter(isShowable).map((claim) => [claim.factIds[0], claim]));
  return {
    patientId,
    window,
    segments,
    documents: documents.map(({ normText, ...document }) => document),
    facts: facts.filter((fact) => supported.has(fact.id)),
    rows: facts.flatMap((fact) => {
      const claim = supported.get(fact.id);
      return claim ? [{ fact, claim }] : [];
    }),
  };
});
export type PatientData = Awaited<ReturnType<typeof patientData>>;
export type PatientRow = PatientData["rows"][number];
