import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { germanLabelTokens } from "../ingest/label-normalise.ts";
import { evidenceWindow, loadFacts } from "../store.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const configured = process.env.MEDLYN_DATA_PATH;
const available = Boolean(
  process.env.DATABASE_URL && configured && existsSync(path.resolve(repoRoot, configured)),
);

describe("stored English labels", () => {
  it.skipIf(!available)("contains no common German words in any eligible labelEn", async () => {
    const facts = await loadFacts(await evidenceWindow());
    expect(facts.length).toBeGreaterThan(0);
    expect(
      facts.filter((fact) => germanLabelTokens(fact.labelEn).length).map((fact) => fact.id),
    ).toEqual([]);
  });
});
