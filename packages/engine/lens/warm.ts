import { pathToFileURL } from "node:url";
import { putCache } from "./cache.ts";
import { CHIPS } from "./needs/profiles.ts";
import { screenFromEvents } from "./screen.ts";
import { streamLens } from "./stream.ts";
import type { LensEvent } from "../contracts.ts";

export async function warm() {
  const results = [];
  for (const chip of CHIPS) {
    const events: LensEvent[] = [];
    for await (const event of streamLens({ text: chip.text, chipId: chip.id, noCache: true })) events.push(event);
    const screen = screenFromEvents(events);
    await putCache(screen);
    const stored = !screen.sections.some((section) => section.cards.some((card) => card.availability === "unavailable"));
    const result = { chipId: chip.id, stored, ...screen.timings };
    results.push(result);
    console.info(JSON.stringify(result));
  }
  if (results.some((result) => !result.stored)) throw new Error("Some lenses could not be warmed because checks were unavailable; retry pnpm warm");
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  warm().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Warm failed");
    process.exitCode = 1;
  });
}
