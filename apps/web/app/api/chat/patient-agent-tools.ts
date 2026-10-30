import { type Calculation, calculate } from "@medlyn/engine/agent/calculation";
import { matchingFacts, normalise, timelinePoints } from "@medlyn/engine/agent/timeline";
import { conceptSynonyms } from "@medlyn/engine/agent/tools";
import {
  type AbsenceResult,
  type AgentTools,
  type EvidenceWindow,
  type Fact,
  FactSummary,
  type Segment,
} from "@medlyn/engine/contracts";
import { getPassage } from "@medlyn/engine/evidence/passage";
import { checkDocumented } from "@medlyn/engine/lens/absence";
import { hybridSearch } from "@medlyn/engine/search/hybrid";
import { loadFacts, loadFindings, loadSegments } from "@medlyn/engine/store";
import type { z } from "zod";

type ToolName = Exclude<keyof typeof AgentTools, "show_source" | "add_to_letter">;
type Implementations = {
  [K in ToolName]: (
    input: z.infer<(typeof AgentTools)[K]["input"]>,
  ) => Promise<K extends "calculate" ? Calculation : z.infer<(typeof AgentTools)[K]["output"]>>;
};

export type AgentEvidence = {
  facts: Map<string, Fact>;
  segments: Map<string, Segment>;
  absences: AbsenceResult[];
  calculations: Calculation[];
};

export function createPatientAgentTools(window: EvidenceWindow, patientId: string) {
  const evidence: AgentEvidence = {
    facts: new Map(),
    segments: new Map(),
    absences: [],
    calculations: [],
  };
  let factsPromise: Promise<Fact[]> | undefined;
  let segmentsPromise: Promise<Segment[]> | undefined;
  const facts = () => (factsPromise ??= loadFacts(window, undefined, patientId));
  const segments = () => (segmentsPromise ??= loadSegments(window, patientId));
  const rememberFacts = (selected: Fact[]) => {
    for (const fact of selected) evidence.facts.set(fact.id, fact);
    return selected;
  };
  const rememberSegments = async (ids: string[]) => {
    const wanted = new Set(ids);
    for (const segment of await segments())
      if (wanted.has(segment.id)) evidence.segments.set(segment.id, segment);
  };
  const implementations: Implementations = {
    async search_facts({ query, kinds }) {
      const hits = await hybridSearch(conceptSynonyms(query).join(" "), window, {
        kinds,
        k: 60,
        patientId,
      });
      const ranks = new Map(hits.map((hit, rank) => [hit.segmentId, rank]));
      const selected = (await facts())
        .filter(
          (fact) => (!kinds?.length || kinds.includes(fact.kind)) && ranks.has(fact.segmentId),
        )
        .sort(
          (a, b) =>
            (ranks.get(a.segmentId) ?? Infinity) - (ranks.get(b.segmentId) ?? Infinity) ||
            a.id.localeCompare(b.id),
        );
      rememberFacts(selected);
      await rememberSegments(selected.map((fact) => fact.segmentId));
      return { facts: selected.map((fact) => FactSummary.parse(fact)) };
    },
    async get_passage({ segmentId }) {
      const view = await getPassage(segmentId);
      if (!window.eligibleDocumentIds.includes(view.document.id))
        throw new Error("Passage is outside the evidence window");
      for (const segment of [...view.before, view.segment, ...view.after])
        evidence.segments.set(segment.id, segment);
      rememberFacts((await facts()).filter((fact) => evidence.segments.has(fact.segmentId)));
      return view;
    },
    async check_documented({ concept }) {
      const qualified = /^documented completion after \d{4}-\d{2}-\d{2} of:/i.test(concept);
      const query = qualified ? `${concept.trim().replace(/\.$/, "")}.` : concept;
      const result = await checkDocumented(query, conceptSynonyms(query), window, { patientId });
      evidence.absences.push(result);
      await rememberSegments(result.segmentIds);
      rememberFacts((await facts()).filter((fact) => result.segmentIds.includes(fact.segmentId)));
      return result;
    },
    async list_findings({ topic }) {
      const findings = (await loadFindings(window, patientId)).filter(
        (finding) =>
          !topic || normalise(`${finding.title} ${finding.explanation}`).includes(normalise(topic)),
      );
      const segmentIds = findings.flatMap((finding) =>
        finding.passages.map((passage) => passage.segmentId),
      );
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
