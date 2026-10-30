import { and, eq } from "drizzle-orm";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/validate.ts";
import {
  type EvidenceWindow,
  type Fact,
  type Screen as LensScreen,
  Screen,
  type Segment,
  type Situation,
} from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { lensCache } from "../db/schema.ts";
import { PATIENT_ID } from "../store.ts";

export const ENGINE_VERSION = "lens-pipeline-16";

export function lensCacheKey(
  situation: Situation,
  window: EvidenceWindow,
  facts: Fact[],
  segments: Segment[],
  patientId = PATIENT_ID,
): string {
  return cacheKey({
    patientId,
    corpusRevision: window.corpusRevision,
    asOf: window.asOf,
    eligibleDocumentIds: window.eligibleDocumentIds,
    validatorVersion: `${VALIDATOR_VERSION}:${ENGINE_VERSION}`,
    text: JSON.stringify(situation),
    facts: facts.map(({ id, contentHash }) => ({ id, contentHash })),
    segmentIds: segments.map((segment) => segment.id),
  });
}

export async function getCache(key: string, patientId = PATIENT_ID): Promise<LensScreen | null> {
  const [row] = await getDb()
    .select({ screen: lensCache.screen })
    .from(lensCache)
    .where(and(eq(lensCache.key, key), eq(lensCache.patientId, patientId)))
    .limit(1);
  if (!row) return null;
  const parsed = Screen.safeParse(row.screen);
  return parsed.success && parsed.data.lensKey === key && parsed.data.patient.id === patientId
    ? parsed.data
    : null;
}

export async function putCache(screen: LensScreen): Promise<void> {
  const checked = Screen.parse(screen);
  if (
    checked.sections.some((section) =>
      section.cards.some((card) => card.availability === "unavailable"),
    )
  )
    return;
  await getDb()
    .insert(lensCache)
    .values({
      key: checked.lensKey,
      patientId: checked.patient.id,
      screen: checked,
      timings: checked.timings,
    })
    .onConflictDoUpdate({
      target: lensCache.key,
      set: { screen: checked, timings: checked.timings, createdAt: new Date() },
    });
}

export const get = getCache;
export const put = putCache;
