import { describe, expect, it } from "vitest";
import { Need, Profile, Situation } from "../contracts.ts";
import { NEEDS } from "../lens/needs/catalog.ts";
import { CHIPS, CRITICAL_NEED_IDS, PROFILES, matchProfile } from "../lens/needs/profiles.ts";

describe("needs and profiles", () => {
  it("validates every need and explanation", () => {
    for (const [id, need] of Object.entries(NEEDS)) {
      expect(Need.safeParse(need).success, id).toBe(true);
      expect(need.id).toBe(id);
      expect(need.synonyms.length).toBeGreaterThan(2);
    }
  });
  it("contains all profile needs and critical needs", () => {
    expect(PROFILES).toHaveLength(14);
    for (const profile of PROFILES) {
      expect(Profile.safeParse(profile).success).toBe(true);
      for (const section of profile.sections) for (const id of section.needIds) expect(NEEDS[id], `${profile.id}: ${id}`).toBeDefined();
    }
    expect(CRITICAL_NEED_IDS).toEqual(["allergies", "antithrombotics"]);
    for (const id of CRITICAL_NEED_IDS) expect(NEEDS[id].critical).toBe(true);
  });
  it("pre-parses the five chips and matches their profiles", () => {
    expect(CHIPS).toHaveLength(5);
    for (const chip of CHIPS) {
      expect(Situation.safeParse(chip.situation).success).toBe(true);
      expect(chip.situation.asOf).toBe("2016-04-15");
      expect(chip.situation.tier).toBe(1);
      expect(matchProfile(chip.situation.role, chip.situation.task)?.id).toBe(chip.profileId);
    }
  });
  it.each(PROFILES.slice(5))("matches tier-2 role $role", (profile) => {
    expect(matchProfile(profile.role, "Review before surgery")?.id).toBe(profile.id);
  });
  it("matches translated roles and specific roles before generic tasks", () => {
    expect(matchProfile("Radiologist", "CT before breast surgery")?.id).toBe("radiologist_contrast");
    expect(matchProfile("Anästhesistin", "Präoperative Untersuchung")?.id).toBe("anaesthesia_preop");
    expect(matchProfile("Dentist", "Tooth extraction")).toBeNull();
    expect(matchProfile("Biographer", "Writing")).toBeNull();
  });
});
