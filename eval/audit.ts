import type { Screen } from "@medlyn/engine/contracts";
import type { Capture } from "./provider.ts";
import { checkAvailability, checkComposed, checkTraceability, loadEvidence, type Check } from "./assertions/evidence.ts";

export type Audit = { status: "measured" | "mock" | "error"; traceability?: Check; composed?: Check; availability: Check; error?: string };

export async function audit(capture: Capture): Promise<Audit> {
  const availability = checkAvailability(capture.screen);
  if (capture.mock) return { status: "mock", availability };
  try {
    const evidence = await loadEvidence(capture.screen);
    const [composed] = await Promise.all([checkComposed(capture.screen, evidence)]);
    return { status: "measured", traceability: checkTraceability(capture.screen, evidence), composed, availability };
  } catch (error) {
    return { status: "error", availability, error: error instanceof Error ? error.message : String(error) };
  }
}

export function hasUnsupportedScreenClaims(screen: Screen): string[] {
  return screen.sections.flatMap((s) => s.cards).flatMap((c) => [...c.lines, ...(c.headline ? [c.headline] : [])])
    .filter((c) => c.validation.support !== "supported" && c.validation.support !== "exempt")
    .map((c) => c.id);
}
