import { hybridSearch } from "../search/hybrid.ts";
import type { z } from "zod";
import { AgentTools, FactSummary, type AbsenceResult, type EvidenceWindow, type Fact, type Segment } from "../contracts.ts";
import { loadFacts, loadFindings, loadSegments } from "../store.ts";
import { checkDocumented } from "../lens/absence.ts";
import { NEEDS } from "../lens/needs/catalog.ts";
import { getPassage } from "../evidence/passage.ts";
import { calculate, type Calculation } from "./calculation.ts";
import { matchingFacts, normalise, timelinePoints } from "./timeline.ts";

type ToolName = Exclude<keyof typeof AgentTools, "show_source" | "add_to_letter">;
type Implementations = {
  [K in ToolName]: (input: z.infer<(typeof AgentTools)[K]["input"]>) => Promise<
    K extends "calculate" ? Calculation : z.infer<(typeof AgentTools)[K]["output"]>
  >;
};

const SYNONYMS = [
  ["ultrasound", "sonography", "sonographie", "ultraschall", "duplex"],
  ["carotid", "carotis", "karotis", "halsschlagader"],
  ["kidney", "renal", "niere", "nieren", "creatinine", "kreatinin", "egfr"],
  ["weight", "gewicht", "korpergewicht"],
  ["blood pressure", "blutdruck", "rr"],
  ["glucose", "blood sugar", "blutzucker", "glukose"],
];

export function conceptSynonyms(concept: string): string[] {
  const completion = concept.match(/^(documented completion after \d{4}-\d{2}-\d{2} of:\s*)(.+)$/i);
  if (completion) {
    const topic = completion[2].replace(/\.\s*$/, "");
    return [...new Set([`${completion[1]}${topic}.`, ...conceptSynonyms(topic).map((term) => `${completion[1]}${term}.`)])];
  }
  const query = normalise(concept);
  const need = Object.values(NEEDS).map((entry) => ({ entry, score: Math.max(0, ...[entry.id.replaceAll("_", " "), entry.title, ...entry.synonyms].map((term) => {
    const folded = normalise(term);
    return folded === query ? 10_000 + folded.length : folded.length >= 4 && query.includes(folded) ? folded.length : 0;
  })) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score)[0]?.entry;
  if (need) return [...new Set([concept, ...need.synonyms])];
  return [...new Set([concept, ...SYNONYMS.filter((group) => group.some((term) => query.includes(normalise(term)))).flat()])];
}

export type AgentEvidence = {
  facts: Map<string, Fact>;
  segments: Map<string, Segment>;
  absences: AbsenceResult[];
  calculations: Calculation[];
};

export function createAgentTools(window: EvidenceWindow) {
  const evidence: AgentEvidence = {
    facts: new Map(),
    segments: new Map(),
    absences: [],
    calculations: [],
  };
  let factsPromise: Promise<Fact[]> | undefined;
  let segmentsPromise: Promise<Segment[]> | undefined;
  const facts = () => factsPromise ??= loadFacts(window);
  const segments = () => segmentsPromise ??= loadSegments(window);
  const rememberFacts = (selected: Fact[]) => {
    for (const fact of selected) evidence.facts.set(fact.id, fact);
    return selected;
  };
  const rememberSegments = async (ids: string[]) => {
    const wanted = new Set(ids);
    for (const segment of await segments()) if (wanted.has(segment.id)) evidence.segments.set(segment.id, segment);
  };
  const implementations: Implementations = {
    async search_facts({ query, kinds }) {
      const hits = await hybridSearch(conceptSynonyms(query).join(" "), window, { kinds, k: 60 });
      const ranks = new Map(hits.map((hit, rank) => [hit.segmentId, rank]));
      const selected = (await facts())
        .filter((fact) => (!kinds?.length || kinds.includes(fact.kind)) && ranks.has(fact.segmentId))
        .sort((a, b) => ranks.get(a.segmentId)! - ranks.get(b.segmentId)! || a.id.localeCompare(b.id));
      rememberFacts(selected);
      await rememberSegments(selected.map((fact) => fact.segmentId));
      return { facts: selected.map((fact) => FactSummary.parse(fact)) };
    },
    async get_passage({ segmentId }) {
      const view = await getPassage(segmentId);
      if (!window.eligibleDocumentIds.includes(view.document.id)) throw new Error("Passage is outside the evidence window");
      for (const segment of [...view.before, view.segment, ...view.after]) evidence.segments.set(segment.id, segment);
      rememberFacts((await facts()).filter((fact) => evidence.segments.has(fact.segmentId)));
      return view;
    },
    async check_documented({ concept }) {
      const qualified = /^documented completion after \d{4}-\d{2}-\d{2} of:/i.test(concept);
      const query = qualified ? `${concept.trim().replace(/\.$/, "")}.` : concept;
      const result = await checkDocumented(query, conceptSynonyms(query), window);
      evidence.absences.push(result);
      await rememberSegments(result.segmentIds);
      rememberFacts((await facts()).filter((fact) => result.segmentIds.includes(fact.segmentId)));
      return result;
    },
    async list_findings({ topic }) {
      const findings = (await loadFindings(window)).filter((finding) => !topic || normalise(`${finding.title} ${finding.explanation}`).includes(normalise(topic)));
      const segmentIds = findings.flatMap((finding) => finding.passages.map((passage) => passage.segmentId));
      await rememberSegments(segmentIds);
      rememberFacts((await facts()).filter((fact) => segmentIds.includes(fact.segmentId)));
      return { findings };
    },
    async timeline({ entityOrKind }) {
      const selected = rememberFacts(matchingFacts(await facts(), entityOrKind));
      await rememberSegments(selected.map((fact) => fact.segmentId));
      return { points: timelinePoints(selected, entityOrKind) };
    },
    async calculate({ expression, factIds }) {
      const ids = [...new Set(factIds)];
      const selected = (await facts()).filter(
        (fact) => ids.includes(fact.id) && fact.support === "supported",
      );
      const result = calculate(expression, ids, selected);
      rememberFacts(selected);
      await rememberSegments(selected.map((fact) => fact.segmentId));
      evidence.calculations.push(result);
      return result;
    },
  };
  return { implementations, evidence };
}
