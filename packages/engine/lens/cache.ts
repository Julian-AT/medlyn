import { createHash } from "node:crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/validate.ts";
import {
  type EvidenceWindow,
  type Fact,
  type LensRequest,
  type Screen as LensScreen,
  Screen,
  type Segment,
  type Situation,
} from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { corpusRevisions, lensCache } from "../db/schema.ts";
import { PATIENT_ID } from "../store.ts";
import { CHIPS } from "./needs/profiles.ts";

export const ENGINE_VERSION = "lens-pipeline-17";

type CacheRequest = LensRequest & { chipId?: string; patientId?: string };

/** A locator for the canonical full-identity row, never a substitute for its evidence key. */
export function requestCacheKey(request: CacheRequest): string {
  const text = request.text.trim().replace(/\s+/g, " ");
  const chip = request.chipId
    ? CHIPS.find((entry) => entry.id === request.chipId)
    : CHIPS.find((entry) => entry.text.trim().toLowerCase() === text.toLowerCase());
  if (request.chipId && !chip) throw new Error("Unknown situation chip");
  return createHash("sha256")
    .update(
      JSON.stringify({
        patientId: request.patientId ?? PATIENT_ID,
        input: chip ? { chipId: chip.id } : { text },
        asOf: request.asOf ?? null,
        version: `${VALIDATOR_VERSION}:${ENGINE_VERSION}`,
      }),
    )
    .digest("hex");
}

/** One row read with a current-revision guard in the same database statement. */
export async function getRequestCache(request: CacheRequest): Promise<LensScreen | null> {
  const patientId = request.patientId ?? PATIENT_ID;
  const db = getDb();
  const latest = db
    .select({ id: corpusRevisions.id })
    .from(corpusRevisions)
    .where(eq(corpusRevisions.patientId, patientId))
    .orderBy(desc(corpusRevisions.createdAt))
    .limit(1);
  const [row] = await db
    .select({ key: lensCache.key, screen: lensCache.screen })
    .from(lensCache)
    .where(
      and(
        eq(lensCache.patientId, patientId),
        or(
          eq(sql<string>`${lensCache.timings}->>'requestKey'`, requestCacheKey(request)),
          sql`${lensCache.timings}->'requestKeys' @> ${JSON.stringify([requestCacheKey(request)])}::jsonb`,
        ),
        eq(sql<string>`${lensCache.screen}->'window'->>'corpusRevision'`, latest),
      ),
    )
    .orderBy(desc(lensCache.createdAt))
    .limit(1);
  if (!row) return null;
  const parsed = Screen.safeParse(row.screen);
  return parsed.success && parsed.data.lensKey === row.key && parsed.data.patient.id === patientId
    ? parsed.data
    : null;
}

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

export async function putCache(screen: LensScreen, request?: CacheRequest): Promise<void> {
  const checked = Screen.parse(screen);
  if (
    checked.sections.some((section) =>
      section.cards.some((card) => card.availability === "unavailable"),
    )
  )
    return;
  const timings = {
    ...checked.timings,
    ...(request ? { requestKey: requestCacheKey(request) } : {}),
  };
  const requestKeys = request ? [requestCacheKey(request)] : [];
  await getDb()
    .insert(lensCache)
    .values({
      key: checked.lensKey,
      patientId: checked.patient.id,
      screen: checked,
      timings: { ...timings, requestKeys },
    })
    .onConflictDoUpdate({
      target: lensCache.key,
      set: {
        screen: checked,
        timings: sql`${lensCache.timings} || ${JSON.stringify(timings)}::jsonb || jsonb_build_object('requestKeys', (
          select coalesce(jsonb_agg(distinct locator), '[]'::jsonb)
          from jsonb_array_elements(coalesce(${lensCache.timings}->'requestKeys', '[]'::jsonb) || ${JSON.stringify(requestKeys)}::jsonb) as aliases(locator)
        ))`,
        createdAt: new Date(),
      },
    });
}

export const get = getCache;
export const put = putCache;
