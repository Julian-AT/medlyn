import { createHash } from "node:crypto";

export function normaliseClaimText(text: string): string {
  return text.normalize("NFC").replace(/\s+/gu, " ").trim();
}

export type CacheIdentity = {
  patientId: string;
  corpusRevision: string;
  asOf: string;
  eligibleDocumentIds: string[];
  validatorVersion: string;
  text: string;
  facts: { id: string; contentHash: string }[];
  segmentIds: string[];
};

export function cacheKey(i: CacheIdentity): string {
  const tuple = [
    i.patientId,
    i.corpusRevision,
    i.asOf,
    [...new Set(i.eligibleDocumentIds)].sort(),
    i.validatorVersion,
    normaliseClaimText(i.text),
    i.facts
      .map(({ id, contentHash }) => [id, contentHash])
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    [...new Set(i.segmentIds)].sort(),
  ];
  return createHash("sha256").update(JSON.stringify(tuple)).digest("hex");
}
