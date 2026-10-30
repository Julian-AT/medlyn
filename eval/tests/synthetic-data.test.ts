import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "../../packages/engine/node_modules/vitest/dist/index.js";
import { repoRoot } from "../data.ts";
import { generateChallenges } from "../synthetic/challenges.ts";
import { validatePatient } from "../synthetic/corpus.ts";
import type { SyntheticPatient } from "../synthetic/types.ts";

const shard = path.join(repoRoot, "ml/data/sample/shards/part-0000.jsonl");

describe("synthetic sample integration", () => {
  it.skipIf(!existsSync(shard))("generates only located expected facts and labelled gaps for all sample patients", async () => {
    const patients: SyntheticPatient[] = (await readFile(shard, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
    const byId = new Map(patients.map((patient) => [patient.patient.id, patient]));
    patients.forEach(validatePatient);
    const challenges = generateChallenges(patients);
    expect(challenges.length).toBeGreaterThanOrEqual(150);
    for (const challenge of challenges) {
      const patient = byId.get(challenge.patientId)!;
      expect(challenge.questions).toHaveLength(3);
      for (const question of challenge.questions) {
        if (question.type === "facts") {
          expect(question.expected.length).toBeGreaterThan(0);
          for (const fact of question.expected) expect(patient.labels.facts).toContainEqual(fact);
        } else if (question.type === "gap") {
          expect(patient.labels.gaps).toContainEqual({ needId: question.needId, concept: question.concept });
        } else {
          expect(question.expected).toEqual(patient.labels.contradictions);
          expect(question.distractors).toEqual(patient.labels.distractors);
        }
      }
    }
  });
});
