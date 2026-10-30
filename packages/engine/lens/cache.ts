import { and, eq } from "drizzle-orm";
import { Screen, type EvidenceWindow, type Fact, type Segment, type Situation, type Screen as LensScreen } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { lensCache } from "../db/schema.ts";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/validate.ts";
import { PATIENT_ID } from "../store.ts";

export const ENGINE_VERSION = "lens-pipeline-5";

export function lensCacheKey(situation: Situation, window: EvidenceWindow, facts: Fact[], segments: Segment[]): string {
  return cacheKey({
    patientId: PATIENT_ID,
    corpusRevision: window.corpusRevision,
    asOf: window.asOf,
    eligibleDocumentIds: window.eligibleDocumentIds,
    validatorVersion: `${VALIDATOR_VERSION}:${ENGINE_VERSION}`,
    text: JSON.stringify(situation),
    facts: facts.map(({ id, contentHash }) => ({ id, contentHash })),
    segmentIds: segments.map((segment) => segment.id),
  });
}

export async function getCache(key: string): Promise<LensScreen | null> {
  const [row] = await getDb().select({ screen: lensCache.screen }).from(lensCache)
    .where(and(eq(lensCache.key, key), eq(lensCache.patientId, PATIENT_ID))).limit(1);
  if (!row) return null;
  const parsed = Screen.safeParse(row.screen);
  return parsed.success && parsed.data.lensKey === key ? parsed.data : null;
}

export async function putCache(screen: LensScreen): Promise<void> {
  const checked = Screen.parse(screen);
  if (checked.sections.some((section) => section.cards.some((card) => card.availability === "unavailable"))) return;
  await getDb().insert(lensCache).values({ key: checked.lensKey, patientId: PATIENT_ID, screen: checked, timings: checked.timings })
    .onConflictDoUpdate({ target: lensCache.key, set: { screen: checked, timings: checked.timings, createdAt: new Date() } });
}

export const get = getCache;
export const put = putCache;
