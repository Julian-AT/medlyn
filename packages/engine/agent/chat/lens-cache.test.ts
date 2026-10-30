import { describe, expect, it } from "vitest";
import { getRequestCache } from "../../lens/cache.ts";
import { CHIPS } from "../../lens/needs/profiles.ts";

describe.skipIf(!process.env.DATABASE_URL)("warmed situation cache", () => {
  it("reuses default-date screens only for the identical explicit window", async () => {
    for (const chip of CHIPS) {
      const request = { text: chip.text, chipId: chip.id };
      const warmed = await getRequestCache(request);
      expect(warmed, `${chip.id} must be warmed before this integration check`).not.toBeNull();
      if (!warmed) continue;
      const explicit = await getRequestCache({ ...request, asOf: warmed.window.asOf });
      expect(explicit?.lensKey).toBe(warmed.lensKey);
      expect(explicit?.window).toEqual(warmed.window);
      const outside = await getRequestCache({ ...request, asOf: "1900-01-01" });
      expect(outside).toBeNull();
    }
  }, 15_000);

  it("does not reuse another patient's warmed screen", async () => {
    const chip = CHIPS[0];
    expect(
      await getRequestCache({
        text: chip.text,
        chipId: chip.id,
        patientId: "synthetic-missing-patient",
      }),
    ).toBeNull();
  });
});
