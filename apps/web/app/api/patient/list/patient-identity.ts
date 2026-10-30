import {
  CASE_PATIENT_ID,
  readablePatientName,
} from "../../../../components/patient/patient-options.ts";
import type { PatientOption } from "../../../../lib/active-patient.ts";

/** Reads generated identity headers; never guesses names from clinical prose. */
export function identityFromDocuments(patient: PatientOption, texts: string[]): PatientOption {
  if (patient.id === CASE_PATIENT_ID) return patient;
  for (const text of texts) {
    const match = text.match(
      /(?:^|\n)\s*(?:(?:Patient(?:in)?|Name)\s*:\s*)?([\p{L}][\p{L} .’'-]{1,99}?),?\s+(?:geb\.?|born)\s*(?:am\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})\b/iu,
    );
    if (!match) continue;
    const birthDate = `${match[4]}-${match[3].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
    const date = new Date(`${birthDate}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate) continue;
    const displayName = match[1].replace(/^(?:Frau|Herr)\s+/i, "").trim();
    const female =
      /^Frau\s/i.test(match[1]) ||
      texts.some((source) =>
        /(?:^|\n)\s*(?:Geschlecht|Sex)\s*:\s*(?:weiblich|female|F)\b/i.test(source),
      );
    const male =
      /^Herr\s/i.test(match[1]) ||
      texts.some((source) =>
        /(?:^|\n)\s*(?:Geschlecht|Sex)\s*:\s*(?:männlich|male|M)\b/i.test(source),
      );
    return {
      ...patient,
      displayName: readablePatientName(patient.id, displayName),
      birthDate,
      sex: female === male ? patient.sex : female ? "F" : "M",
    };
  }
  return { ...patient, displayName: readablePatientName(patient.id, patient.displayName) };
}
