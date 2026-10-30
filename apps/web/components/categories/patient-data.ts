import "server-only";
import { isShowable, validateClaims } from "@medlyn/engine/claims/validate";
import { renderLine } from "@medlyn/engine/lens/templates";
import {
  evidenceWindow,
  loadDocuments,
  loadFacts,
  loadSegments,
  PATIENT_ID,
} from "@medlyn/engine/store";
import { cache } from "react";
export const patientData = cache(async (patientId = PATIENT_ID, asOf?: string) => {
  const window = await evidenceWindow(asOf, patientId);
  const [documents, facts, segments] = await Promise.all([
    loadDocuments(window, patientId),
    loadFacts(window, undefined, patientId),
    loadSegments(window, patientId),
  ]);
  const ctx = { patientId, window, facts, segments };
  const claims = await validateClaims(
    facts.map((fact) => renderLine(fact, ctx)),
    ctx,
  );
  const supported = new Map(claims.filter(isShowable).map((claim) => [claim.factIds[0], claim]));
  return {
    window,
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
