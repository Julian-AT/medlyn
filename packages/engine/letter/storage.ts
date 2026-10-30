import { and, eq } from "drizzle-orm";
import { Letter, type Fact, type ReviewEntry } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { letters } from "../db/schema.ts";
import { evidenceWindow, loadFacts, PATIENT_ID } from "../store.ts";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/version.ts";
import { applyLetterReviews, flagChangedSources } from "./reviews.ts";

export async function saveLetter(letter: Letter): Promise<void> {
  const parsed = Letter.parse(letter);
  await getDb().insert(letters).values({ id: parsed.id, patientId: PATIENT_ID, sessionId: parsed.sessionId, lensKey: parsed.lensKey, claims: parsed, annotations: parsed.annotations, createdAt: new Date(parsed.createdAt) }).onConflictDoUpdate({ target: letters.id, set: { claims: parsed, annotations: parsed.annotations } });
}

export async function loadLetter(letterId: string, sessionId: string): Promise<Letter> {
  const [row] = await getDb().select().from(letters).where(and(eq(letters.id, letterId), eq(letters.sessionId, sessionId), eq(letters.patientId, PATIENT_ID))).limit(1);
  if (!row) throw new Error("Letter not found in this session");
  return Letter.parse(row.claims);
}

export async function refreshSessionLetters(sessionId: string, entries: ReviewEntry[], facts?: Fact[]): Promise<void> {
  const rows = await getDb().select().from(letters).where(and(eq(letters.sessionId, sessionId), eq(letters.patientId, PATIENT_ID)));
  await Promise.all(rows.map(async (row) => {
    const original = Letter.parse(row.claims);
    const window = await evidenceWindow(original.asOf);
    const currentFacts = facts ?? await loadFacts(window);
    const reviewed = applyLetterReviews(original, entries, currentFacts);
    const letter = flagChangedSources(reviewed, (claim) => cacheKey({ patientId: PATIENT_ID, ...window, validatorVersion: VALIDATOR_VERSION, text: claim.text, facts: claim.factIds.map((id) => ({ id, contentHash: currentFacts.find((fact) => fact.id === id)?.contentHash ?? "missing" })), segmentIds: claim.segmentIds }));
    await saveLetter(letter);
  }));
}
