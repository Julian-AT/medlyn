import "server-only";
import { getDb } from "@medlyn/engine/db/client";
import { documents } from "@medlyn/engine/db/schema";
import { patientView } from "@medlyn/engine/lens/screen";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  DEFAULT_PATIENT_ID,
  PATIENT_COOKIE,
  type PatientOption,
  validPatientId,
} from "./active-patient";

export async function activePatientId(): Promise<string> {
  const value = (await cookies()).get(PATIENT_COOKIE)?.value;
  return validPatientId(value) ? value : DEFAULT_PATIENT_ID;
}

export const patientList = cache(async (): Promise<PatientOption[]> => {
  const [docs, sources] = await Promise.all([
    getDb().select({ patientId: documents.patientId, docDate: documents.docDate }).from(documents),
    getDb().query.segments.findMany({
      where: (segment, { or, ilike }) =>
        or(ilike(segment.text, "%geb%"), ilike(segment.text, "%born%")),
      orderBy: (segment, { asc }) => [asc(segment.documentId), asc(segment.ordinal)],
    }),
  ]);
  const ids = [...new Set(docs.map((document) => document.patientId))];
  return ids
    .map((id) => {
      const owned = docs.filter((document) => document.patientId === id);
      try {
        const patient = patientView(
          sources.filter((source) => source.patientId === id),
          id,
        );
        return {
          id,
          displayName: id === DEFAULT_PATIENT_ID ? "Anna Musterfrau" : patient.displayName,
          sex: patient.sex,
          birthDate: patient.birthDate,
          asOf:
            owned
              .map((document) => document.docDate)
              .sort()
              .at(-1) ?? "",
          documentCount: owned.length,
        };
      } catch (error) {
        console.warn("patient_identity_unavailable", {
          patientId: id,
          reason: error instanceof Error ? error.name : "Unknown",
        });
        return {
          id,
          displayName: id,
          sex: "X" as const,
          birthDate: null,
          asOf:
            owned
              .map((document) => document.docDate)
              .sort()
              .at(-1) ?? "",
          documentCount: owned.length,
        };
      }
    })
    .sort((a, b) =>
      a.id === DEFAULT_PATIENT_ID
        ? -1
        : b.id === DEFAULT_PATIENT_ID
          ? 1
          : a.displayName.localeCompare(b.displayName),
    );
});
