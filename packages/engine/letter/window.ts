import type { EvidenceWindow, Screen } from "../contracts.ts";
import { getCache } from "../lens/cache.ts";
import { evidenceWindow, PATIENT_ID } from "../store.ts";
import type { BuildLetterRequest } from "./build.ts";

export class LetterWindowConflict extends Error {
  readonly status = 409;
}

type WindowDependencies = {
  getCache: (key: string) => Promise<Screen | null>;
  evidenceWindow: (asOf?: string) => Promise<EvidenceWindow>;
};

/** A lens key may be retained only when its entire evidence window still matches. */
export async function resolveLetterWindow(
  req: BuildLetterRequest,
  deps: WindowDependencies = { getCache, evidenceWindow },
): Promise<EvidenceWindow> {
  const screen = req.lensKey ? await deps.getCache(req.lensKey) : null;
  if (
    req.lensKey &&
    (!screen || screen.lensKey !== req.lensKey || screen.patient.id !== PATIENT_ID)
  ) {
    throw new LetterWindowConflict("Lens unavailable; reload the lens before generating a letter");
  }
  const cached = screen?.window;
  if (
    cached &&
    ((req.asOf && req.asOf !== cached.asOf) ||
      (req.corpusRevision && req.corpusRevision !== cached.corpusRevision) ||
      screen.situation.asOf !== cached.asOf)
  ) {
    throw new LetterWindowConflict("Letter request conflicts with the lens evidence window");
  }
  const window = await deps.evidenceWindow(cached?.asOf ?? req.asOf);
  const sameIds =
    !cached ||
    JSON.stringify([...cached.eligibleDocumentIds].sort()) ===
      JSON.stringify([...window.eligibleDocumentIds].sort());
  if (
    (req.corpusRevision && req.corpusRevision !== window.corpusRevision) ||
    (cached &&
      (cached.asOf !== window.asOf || cached.corpusRevision !== window.corpusRevision || !sameIds))
  ) {
    throw new LetterWindowConflict(
      "Lens evidence window changed; reload the lens before generating a letter",
    );
  }
  return window;
}
