import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEEDS } from "@medlyn/engine/lens/needs/catalog";
import { PROFILES } from "@medlyn/engine/lens/needs/profiles";
import { evalRoot } from "../data.ts";
import { loadPatients } from "./corpus.ts";
import type { Challenge, LabelFact, Question, SyntheticPatient } from "./types.ts";

const novelRoles = ["Geriatrician", "Physiotherapist", "Social worker", "Occupational therapist"];
const folded = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

export function factsForNeed(patient: SyntheticPatient, needId: string): LabelFact[] {
  const need = NEEDS[needId];
  if (!need || patient.labels.gaps.some((gap) => gap.needId === needId)) return [];
  return patient.labels.facts.filter((fact) => labelFactMatchesNeed(fact, needId));
}

export function labelFactMatchesNeed(fact: LabelFact, needId: string): boolean {
  const need = NEEDS[needId];
  if (!need) return false;
  if (fact.needIds) return fact.needIds.includes(needId);
  if (!need.kinds.includes(fact.kind)) return false;
  if (needId === "current_medication_list") return fact.kind === "medication";
  const text = folded(`${fact.labelEn} ${fact.quote} ${JSON.stringify(fact.attrs)}`);
  return need.synonyms.some((word) => {
    const escaped = folded(word).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(text);
  });
}

export function generateChallenges(patients: SyntheticPatient[], minimum = 150): Challenge[] {
  if (!patients.length) return [];
  const perPatient = Math.max(3, Math.ceil(minimum / patients.length));
  return patients.flatMap((patient, patientIndex) => Array.from({ length: perPatient }, (_, ordinal) => {
    const tier = (ordinal % 3 + 1) as 1 | 2 | 3;
    const pool = tier === 1 ? PROFILES.slice(0, 5) : PROFILES.slice(5);
    const offset = (patientIndex + Math.floor(ordinal / 3)) % pool.length;
    const profile = [...pool.slice(offset), ...pool.slice(0, offset)].find((entry) =>
      tier === 3 || entry.sections.some((section) => section.needIds.some((id) => factsForNeed(patient, id).length)));
    if (!profile) throw new Error(`${patient.patient.id}: no facts match tier ${tier} profiles`);
    const profileIndex = PROFILES.indexOf(profile);
    const candidates = (tier === 3 ? Object.keys(NEEDS) : profile.sections.flatMap((s) => s.needIds))
      .map((id) => ({ id, facts: factsForNeed(patient, id) })).filter((entry) => entry.facts.length);
    const chosen = candidates[(patientIndex + ordinal) % Math.max(1, candidates.length)];
    if (!chosen) throw new Error(`${patient.patient.id}: no labelled facts match ${profile.id}`);
    const gap = patient.labels.gaps.find((g) => tier === 3 || profile.sections.some((s) => s.needIds.includes(g.needId)));
    const second = candidates[(patientIndex + ordinal + 1) % candidates.length];
    const asOf = patient.documents.map((doc) => String(doc.metadata.date)).sort().at(-1)!;
    const id = `${patient.patient.id}-t${tier}-${ordinal + 1}`;
    const factQuestion = (suffix: string, entry: typeof chosen): Question => ({
      id: `${id}-${suffix}`, type: "facts", needId: entry.id,
      text: `What does the record document about ${NEEDS[entry.id].title.toLowerCase()}? Include assertion, timing and dated sources.`,
      expected: entry.facts,
    });
    const questions: [Question, Question, Question] = [factQuestion("1", chosen), gap ? {
      id: `${id}-2`, type: "gap", needId: gap.needId, concept: gap.concept,
      text: `Is ${gap.concept} documented in the available record?`,
    } : factQuestion("2", second), {
      id: `${id}-3`, type: "contradictions",
      text: "Which source statements require contradiction review? Distinguish changes over time, measurement variation and omissions.",
      expected: patient.labels.contradictions, distractors: patient.labels.distractors,
    }];
    const topics = [chosen.id, gap?.needId ?? second.id].map((key) => NEEDS[key]?.title ?? key);
    const role = tier === 3 ? novelRoles[(patientIndex + ordinal) % novelRoles.length] : profile.role;
    const task = tier === 1 ? ["Preoperative assessment", "Plan surgery after tumour board",
      "Diabetes review", "Assess dizziness and blurred vision", "Review open follow-ups"][profileIndex]
      : tier === 2 ? "Review documented findings for this specialty" : "Assess daily function and coordinate care";
    return {
      id, patientId: patient.patient.id, tier, profileId: tier === 3 ? null : profile.id,
      situation: `Role: ${role}. ${task}. Focus on ${topics.join(" and ")}; include documented conflicts.`,
      asOf, mutationTypes: [...new Set(patient.labels.mutations.map((m) => m.type))].sort(), questions,
    };
  }));
}

export async function writeChallenges(challenges: Challenge[]): Promise<void> {
  await writeFile(path.join(evalRoot, "synthetic/challenges.json"), `${JSON.stringify(challenges, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const patients = await loadPatients();
  if (!patients.length) throw new Error("No synthetic patients available; generate ml/data/sample first");
  const challenges = generateChallenges(patients);
  await writeChallenges(challenges);
  console.log(`Generated ${challenges.length} challenges / ${patients.length} patients / ${challenges.length * 3} questions`);
}
