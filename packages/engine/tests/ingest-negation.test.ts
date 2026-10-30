import { describe, expect, it } from "vitest";
import { negationFlag } from "../ingest/negation.ts";
import { NEGATION_TRIGGERS } from "../ingest/negation-triggers.ts";

describe("German NegEx review flag", () => {
  it("preserves all upstream trigger entries", () => {
    expect(NEGATION_TRIGGERS).toHaveLength(512);
  });

  it.each([
    ["Kein Fieber heute festgestellt.", "Fieber"],
    ["Die Untersuchung zeigt keinen Hinweis auf Ödeme.", "Ödeme"],
    ["Thrombose wurde ausgeschlossen.", "Thrombose"],
    ["Ein Erguß ist nicht vorhanden.", "Erguss"],
    ["Die Patientin kommt ohne Übelkeit.", "Uebelkeit"],
  ])("flags nearby PRE/POST triggers: %s", (passage, concept) => {
    expect(negationFlag(passage, concept, "present")).toBe(true);
  });

  it("flags any negated occurrence of a repeated concept", () => {
    expect(negationFlag("Fieber gestern. Heute kein Fieber.", "Fieber", "present")).toBe(true);
  });

  it.each([
    ["Nicht nur Fieber wurde protokolliert.", "Fieber"],
    ["Ohne Schwierigkeiten wurde das Ödem untersucht.", "Ödem"],
    ["Kein Husten, aber Fieber vorhanden.", "Fieber"],
    ["Kein Husten. Fieber seit heute.", "Fieber"],
    ["Kein Husten; Fieber vorhanden.", "Fieber"],
    ["Kein gestern zuvor dort zusätzlich erneut erstmals morgens beobachtetes Fieber.", "Fieber"],
    ["Mögliches Fieber wird abgeklärt.", "Fieber"],
    ["Fieber nachgewiesen.", "Husten"],
    ["Fieber nachgewiesen.", ""],
  ])("does not cross scope boundaries or pseudo triggers: %s", (passage, concept) => {
    expect(negationFlag(passage, concept, "present")).toBe(false);
  });

  it.each(["negated", "suspected", "historical"] as const)("does not flag assertion %s", (assertion) => {
    expect(negationFlag("Kein Fieber heute.", "Fieber", assertion)).toBe(false);
  });
});
