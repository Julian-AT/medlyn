import { and, eq } from "drizzle-orm";
import { type EvidenceWindow, Screen } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { lensCache } from "../db/schema.ts";
import { evidenceWindow, PATIENT_ID } from "../store.ts";

export async function agentContext(
  lensKey: string | null,
): Promise<{ window: EvidenceWindow; claimIds: string[] }> {
  if (!lensKey) return { window: await evidenceWindow(), claimIds: [] };
  const [row] = await getDb()
    .select({ screen: lensCache.screen })
    .from(lensCache)
    .where(and(eq(lensCache.key, lensKey), eq(lensCache.patientId, PATIENT_ID)))
    .limit(1);
  if (!row) throw new Error("Lens context unavailable; refresh the situation");
  const screen = Screen.parse(row.screen);
  const window = await evidenceWindow(screen.window.asOf);
  const expected = [...screen.window.eligibleDocumentIds].sort().join("\n");
  if (
    window.corpusRevision !== screen.window.corpusRevision ||
    [...window.eligibleDocumentIds].sort().join("\n") !== expected
  ) {
    throw new Error("Lens evidence changed; refresh the situation");
  }
  const claims = screen.sections.flatMap((section) =>
    section.cards.flatMap((card) => [...card.lines, ...(card.headline ? [card.headline] : [])]),
  );
  const claimIds = claims
    .filter(
      (claim) =>
        claim.validation.key &&
        (claim.validation.support === "supported" || claim.validation.support === "exempt"),
    )
    .map((claim) => claim.id);
  return { window, claimIds };
}

export async function agentWindow(lensKey: string | null): Promise<EvidenceWindow> {
  return (await agentContext(lensKey)).window;
}
