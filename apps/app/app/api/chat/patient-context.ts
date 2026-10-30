import { Screen } from "@medlyn/engine/contracts";
import { getDb } from "@medlyn/engine/db/client";
import { assertWindowCurrent, evidenceWindow } from "@medlyn/engine/store";

export async function chatContext(lensKey: string | null, patientId: string) {
  if (!lensKey)
    return { window: await evidenceWindow(undefined, patientId), claimIds: [] as string[] };
  const row = await getDb().query.lensCache.findFirst({
    where: (cache, { and, eq }) => and(eq(cache.key, lensKey), eq(cache.patientId, patientId)),
  });
  if (!row) throw new Error("Lens context unavailable for this patient");
  const screen = Screen.parse(row.screen);
  if (screen.patient.id !== patientId) throw new Error("Lens patient mismatch");
  await assertWindowCurrent(screen.window, patientId);
  const claims = screen.sections.flatMap((section) =>
    section.cards.flatMap((card) => [...card.lines, ...(card.headline ? [card.headline] : [])]),
  );
  return {
    window: screen.window,
    claimIds: claims
      .filter((claim) => claim.validation.support === "supported")
      .map((claim) => claim.id),
  };
}
