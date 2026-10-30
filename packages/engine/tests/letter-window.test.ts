import { describe, expect, it } from "vitest";
import type { EvidenceWindow, Screen } from "../contracts.ts";
import { mockLensEvents } from "../lens/mock.ts";
import { LetterWindowConflict, resolveLetterWindow } from "../letter/window.ts";
import { required } from "../required.ts";
import { PATIENT_ID } from "../store.ts";

const window: EvidenceWindow = {
  asOf: "2015-06-28",
  eligibleDocumentIds: ["older-a", "older-b"],
  corpusRevision: "revision-a",
};
function cachedScreen(): Screen {
  const start = required(mockLensEvents.find((event) => event.type === "situation"));
  return {
    lensKey: "older-lens",
    patient: { ...start.patient, id: PATIENT_ID },
    situation: { ...start.situation, asOf: window.asOf },
    window: structuredClone(window),
    critical: [],
    sections: [],
    findings: [],
    openQuestions: [],
    timings: { planMs: 0, totalMs: 0, cached: true },
  };
}
describe("letter lens evidence window", () => {
  it("resolves the older lens date through the shared window before reading evidence", async () => {
    let resolved: string | undefined;
    const result = await resolveLetterWindow(
      { sessionId: "s", lensKey: "older-lens" },
      {
        getCache: async () => cachedScreen(),
        evidenceWindow: async (asOf) => {
          resolved = asOf;
          return window;
        },
      },
    );
    expect(resolved).toBe("2015-06-28");
    expect(result).toBe(window);
  });
  it.each([{ asOf: "2016-04-15" }, { corpusRevision: "revision-b" }])(
    "rejects explicit conflicts before loading a window: %j",
    async (explicit) => {
      await expect(
        resolveLetterWindow(
          { sessionId: "s", lensKey: "older-lens", ...explicit },
          {
            getCache: async () => cachedScreen(),
            evidenceWindow: async () => {
              throw new Error("Must not resolve a conflicting request");
            },
          },
        ),
      ).rejects.toMatchObject({ status: 409 });
    },
  );
  it.each([
    { corpusRevision: "revision-b" },
    { eligibleDocumentIds: ["older-a"] },
    { eligibleDocumentIds: ["older-a", "newer-c"] },
    { asOf: "2016-04-15" },
  ])("rejects a stale cached window: %j", async (changed) => {
    await expect(
      resolveLetterWindow(
        { sessionId: "s", lensKey: "older-lens" },
        {
          getCache: async () => cachedScreen(),
          evidenceWindow: async () => ({ ...window, ...changed }),
        },
      ),
    ).rejects.toBeInstanceOf(LetterWindowConflict);
  });
  it("accepts matching explicit context and reordered eligible ids", async () => {
    const result = await resolveLetterWindow(
      {
        sessionId: "s",
        lensKey: "older-lens",
        asOf: window.asOf,
        corpusRevision: window.corpusRevision,
      },
      {
        getCache: async () => cachedScreen(),
        evidenceWindow: async () => ({
          ...window,
          eligibleDocumentIds: [...window.eligibleDocumentIds].reverse(),
        }),
      },
    );
    expect(result.asOf).toBe(window.asOf);
  });
  it.each(["missing", "other-patient", "wrong-key", "inconsistent-date"])(
    "rejects an unavailable or invalid cached lens: %s",
    async (reason) => {
      const screen = cachedScreen();
      if (reason === "other-patient") screen.patient.id = "different-patient";
      if (reason === "wrong-key") screen.lensKey = "different-key";
      if (reason === "inconsistent-date") screen.situation.asOf = "2016-04-15";
      await expect(
        resolveLetterWindow(
          { sessionId: "s", lensKey: "older-lens" },
          {
            getCache: async () => (reason === "missing" ? null : screen),
            evidenceWindow: async () => {
              throw new Error("Must not resolve an invalid lens");
            },
          },
        ),
      ).rejects.toMatchObject({ status: 409 });
    },
  );
  it("uses the shared default when no lens or date is supplied", async () => {
    const result = await resolveLetterWindow(
      { sessionId: "s" },
      {
        getCache: async () => {
          throw new Error("No lens lookup expected");
        },
        evidenceWindow: async (asOf) => {
          expect(asOf).toBeUndefined();
          return window;
        },
      },
    );
    expect(result).toBe(window);
  });
  it("checks an explicit revision even without a lens key", async () => {
    await expect(
      resolveLetterWindow(
        { sessionId: "s", corpusRevision: "stale" },
        {
          getCache: async () => null,
          evidenceWindow: async () => window,
        },
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});
