import { performance } from "node:perf_hooks";
import { LensRequest as RequestSchema, LensEvent as EventSchema, type AbsenceResult, type LensEvent, type LensRequest, type Section, type Situation } from "../contracts.ts";
import { documentCount, evidenceWindow, loadDocuments, loadFacts, loadFindings, loadSegments } from "../store.ts";
import { checkDocumented, containsSynonym, type AbsenceOptions } from "./absence.ts";
import { getCache, lensCacheKey, putCache } from "./cache.ts";
import { parseSituation } from "./parse.ts";
import { absenceConcept, completionCandidates, followupNeeds, plan, type PlannedSection } from "./plan.ts";
import { renderCard, type RenderContext, type RenderedCard } from "./render.ts";
import { openQuestions, patientView, screenEvents, screenFromEvents } from "./screen.ts";
import { emptySelection, selectSection } from "./select.ts";

type CompletedSection = { section: Section; headlines: { cardId: string; claim: RenderedCard["headline"] }[] };

/** Yields completions as they settle, including when several settle between consumer reads. */
export async function* asCompleted<T>(jobs: Promise<T>[]): AsyncGenerator<T> {
  const remaining = new Map(jobs.map((job, index) => [index, job.then((value) => ({ index, value }))]));
  while (remaining.size) {
    const { index, value } = await Promise.race(remaining.values());
    remaining.delete(index);
    yield value;
  }
}

export async function* streamLens(req: LensRequest & { chipId?: string }): AsyncGenerator<LensEvent> {
  const started = performance.now();
  try {
    RequestSchema.parse(req);
    const window = await evidenceWindow(req.asOf);
    const situationJob = parseSituation(req.text, window.asOf, req.chipId);
    const sourcesJob = Promise.all([loadFacts(window), loadSegments(window)]);
    const findingsJob = loadFindings(window);
    const absenceSourcesJob = Promise.all([loadDocuments(window), documentCount()]);
    // Attach rejection handlers immediately while parsing and planning are in flight.
    const background = Promise.allSettled([sourcesJob, findingsJob, absenceSourcesJob]);
    const situation = await situationJob;
    const planned = await plan(situation);
    situation.tier = planned.tier;
    const [facts, segments] = await sourcesJob;
    const lensKey = lensCacheKey(situation, window, facts, segments);
    if (!req.noCache) {
      const cached = await getCache(lensKey).catch((error: unknown) => {
        console.warn("lens_cache_read_failed", { reason: error instanceof Error ? error.name : "Error" });
        return null;
      });
      if (cached) {
        const elapsed = performance.now() - started;
        cached.timings = { planMs: elapsed, firstSectionMs: elapsed, totalMs: elapsed, cached: true };
        for (const event of screenEvents(cached)) yield event;
        return;
      }
    }
    const planMs = performance.now() - started;
    const first: LensEvent = {
      type: "situation", lensKey, patient: patientView(segments), situation, window,
      sectionTitles: planned.sections.map(({ id, title }) => ({ id, title })),
    };
    const events: LensEvent[] = [first];
    yield first;
    const findings = await findingsJob;
    const ctx: RenderContext = { window, facts, segments, findings };
    const absenceSources = absenceSourcesJob.then(([documents, total]): AbsenceOptions => ({ documents, total, segments }));
    const absenceChecks = new Map<string, Promise<AbsenceResult>>();
    const check = (need: PlannedSection["needs"][number]) => {
      const existing = absenceChecks.get(need.id);
      if (existing) return existing;
      const result = absenceSources.then((sources) => checkDocumented(absenceConcept(need), need.synonyms, window, sources));
      absenceChecks.set(need.id, result);
      return result;
    };
    const completedNeeds = new Set<string>();
    const jobs = planned.sections.map((section) => {
      const extra = followupNeeds(section, facts).filter((need) => {
        if (completedNeeds.has(need.id)) return false;
        completedNeeds.add(need.id);
        return true;
      });
      return completeSection({ ...section, needs: [...section.needs, ...extra] }, situation, ctx, check);
    });
    const finished: CompletedSection[] = [];
    let firstSectionMs: number | undefined;
    for await (const result of asCompleted(jobs)) {
      firstSectionMs ??= performance.now() - started;
      finished.push(result);
      const event: LensEvent = { type: "section", section: result.section };
      events.push(event);
      yield event;
    }
    const headlineJobs = finished.flatMap((result) => result.headlines.map(async ({ cardId, claim }) => {
      const headline = await claim;
      return headline ? { type: "headline" as const, cardId, headline } : null;
    }));
    for await (const event of asCompleted(headlineJobs)) {
      if (!event) continue;
      events.push(event);
      yield event;
    }
    const sections = finished.map((result) => result.section);
    const findingsEvent: LensEvent = {
      type: "findings",
      critical: sections.flatMap((section) => section.cards.filter((card) => card.critical).map((card) => card.id)),
      findings,
      openQuestions: openQuestions(sections, findings),
    };
    events.push(findingsEvent);
    yield findingsEvent;
    await background;
    const timings = { planMs, ...(firstSectionMs === undefined ? {} : { firstSectionMs }), totalMs: performance.now() - started, cached: false };
    const done: LensEvent = { type: "done", timings };
    if (!req.noCache) {
      await putCache(screenFromEvents([...events, done])).catch((error: unknown) => {
        console.warn("lens_cache_write_failed", { reason: error instanceof Error ? error.name : "Error" });
      });
      timings.totalMs = performance.now() - started;
    }
    yield EventSchema.parse(done);
  } catch (error) {
    console.error("lens_pipeline_failed", { reason: error instanceof Error ? error.name : "Error" });
    yield { type: "error", message: "Couldn't build this lens. Please retry.", retryable: true };
  }
}

async function completeSection(
  section: PlannedSection,
  situation: Situation,
  ctx: RenderContext,
  check: (need: PlannedSection["needs"][number]) => Promise<AbsenceResult>,
): Promise<CompletedSection> {
  for (const need of section.needs) {
    const candidates = completionCandidates(need, ctx.facts);
    const quantitativeLab = need.kinds.includes("lab") && need.requiredFields?.includes("value");
    const specificCheck = quantitativeLab || "afterDocumentDate" in need || need.id.endsWith("_exam");
    if (!candidates.length || (specificCheck && !candidates.some((fact) => containsSynonym(`${fact.labelEn} ${fact.quote}`, need.synonyms)))) {
      void check(need).catch(() => undefined);
    }
  }
  let failed = false;
  const selections = await selectSection(section, situation, ctx.facts).catch((error: unknown) => {
    failed = true;
    console.warn("lens_selection_failed", { sectionId: section.id, reason: error instanceof Error ? error.message : "Selection failed" });
    return section.needs.map(emptySelection);
  });
  const rendered = await Promise.all(section.needs.map(async (need) => {
    let selection = selections.find((entry) => entry.needId === need.id) ?? emptySelection(need);
    const candidates = completionCandidates(need, ctx.facts);
    const candidateIds = new Set(("afterDocumentDate" in need ? candidates : ctx.facts).map((fact) => fact.id));
    selection = { ...selection, factIds: selection.factIds.filter((id) => candidateIds.has(id)) };
    if (selection.headline?.factIds.some((id) => !selection.factIds.includes(id))) selection.headline = null;
    let absence: AbsenceResult | undefined;
    if (!selection.factIds.length && !failed) {
      try {
        absence = await check(need);
        if (absence.status === "documented") {
          const hits = new Set(absence.segmentIds);
          const retry = await selectSection({ ...section, needs: [need] }, situation, candidates, ctx.segments.filter((segment) => hits.has(segment.id)));
          selection = retry[0] ?? selection;
        }
      } catch (error) {
        console.warn("lens_need_unavailable", { needId: need.id, reason: error instanceof Error ? error.name : "Error" });
        return renderCard(need, emptySelection(need), ctx, undefined, true);
      }
    }
    return renderCard(need, selection, ctx, absence, failed);
  }));
  return {
    section: { id: section.id, title: section.title, cards: rendered.map(({ card }) => card) },
    headlines: rendered.map(({ card, headline }) => ({ cardId: card.id, claim: headline.catch(() => undefined) })),
  };
}
