import { tool } from "ai";
import { z } from "zod";
import { isShowable, validateClaims } from "../claims/validate.ts";
import {
  AbsenceResult,
  ClaimLine,
  type EvidenceWindow,
  type Fact,
  FactKind,
  Finding,
  type LensEvent,
  Letter,
  MedicationAttrs,
  OpenQuestion,
  PassageView,
  Section,
  type Segment,
  Situation,
  Timings,
} from "../contracts.ts";
import { formatDate } from "../dates.ts";
import { passageContext } from "../evidence/passage.ts";
import { checkDocumented } from "../lens/absence.ts";
import { screenFromEvents } from "../lens/screen.ts";
import { streamLens } from "../lens/stream.ts";
import { medicationSchedule, renderLine, trendLines } from "../lens/templates.ts";
import { buildLetter } from "../letter/build.ts";
import { hybridSearch } from "../search/hybrid.ts";
import {
  assertWindowCurrent,
  documentCount,
  evidenceWindow,
  loadDocuments,
  loadFacts,
  loadFindings,
  loadSegments,
  PATIENT_ID,
} from "../store.ts";
import { conceptSynonyms } from "./tools.ts";

const EvidenceLine = z.object({
  factId: z.string(),
  segmentId: z.string(),
  documentId: z.string(),
  quote: z.string(),
  line: ClaimLine,
});
const MedicationRow = EvidenceLine.extend({ schedule: z.string() });
const TrendPoint = z.object({
  date: z.string(),
  value: z.number(),
  unit: z.string(),
  series: z.string(),
  factId: z.string(),
  segmentId: z.string(),
  quote: z.string(),
  line: ClaimLine,
});

export const UiToolSchemas = {
  open_lens: z.object({
    lensKey: z.string(),
    situation: Situation,
    sections: z.array(Section),
    findings: z.array(Finding),
    openQuestions: z.array(OpenQuestion),
    timings: Timings,
  }),
  show_patient_summary: z.object({
    patientId: z.string(),
    asOf: z.string(),
    documentCount: z.number().int(),
    demographics: z.array(EvidenceLine),
    counts: z.array(z.object({ kind: FactKind, count: z.number().int() })),
    criticalFacts: z.array(EvidenceLine),
  }),
  show_medications: z.object({
    asOf: z.string(),
    lists: z.array(
      z.object({
        listLabel: z.string(),
        documentId: z.string(),
        date: z.string(),
        lines: z.array(MedicationRow),
      }),
    ),
    changes: z.array(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
        from: MedicationRow,
        to: MedicationRow,
      }),
    ),
  }),
  show_lab_trend: z.object({
    measure: z.string(),
    asOf: z.string(),
    points: z.array(TrendPoint),
    deltaLine: ClaimLine.nullable(),
  }),
  show_timeline: z.object({
    asOf: z.string(),
    events: z.array(EvidenceLine.extend({ date: z.string(), kind: FactKind })),
  }),
  show_findings: z.object({ asOf: z.string(), findings: z.array(Finding) }),
  show_passage: PassageView,
  check_documented: AbsenceResult,
  draft_letter: Letter,
} as const;

export type UiToolOutputs = {
  [K in keyof typeof UiToolSchemas]: z.infer<(typeof UiToolSchemas)[K]>;
};
export type UiToolContext = { patientId: string; window: EvidenceWindow; sessionId: string };
type Sources = { facts: Fact[]; segments: Segment[] };
type DisplayLine = z.infer<typeof EvidenceLine>;

/** Reject stale caller windows before touching patient-specific tool data. */
async function verifyWindow(ctx: UiToolContext) {
  const current = await evidenceWindow(ctx.window.asOf, ctx.patientId);
  if (
    current.corpusRevision !== ctx.window.corpusRevision ||
    JSON.stringify([...current.eligibleDocumentIds].sort()) !==
      JSON.stringify([...ctx.window.eligibleDocumentIds].sort())
  ) {
    throw new Error("Evidence window changed; reload before using this tool");
  }
}

export function locatedUiFacts(facts: Fact[], segments: Segment[]): Fact[] {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  return facts.filter((fact) => {
    const segment = byId.get(fact.segmentId);
    return (
      fact.locationOk &&
      fact.support === "supported" &&
      segment &&
      segment.documentId === fact.documentId &&
      fact.quote.trim().length > 0 &&
      fact.start >= segment.start &&
      fact.end <= segment.end &&
      segment.text.slice(fact.start - segment.start, fact.end - segment.start) === fact.quote
    );
  });
}

async function displayLines(
  facts: Fact[],
  sources: Sources,
  ctx: UiToolContext,
): Promise<DisplayLine[]> {
  const claims = await validateClaims(
    facts.map((fact) => renderLine(fact, ctx)),
    { ...ctx, ...sources },
  );
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  return claims.filter(isShowable).flatMap((line) => {
    const fact = byId.get(line.factIds[0]);
    return fact
      ? [
          {
            factId: fact.id,
            segmentId: fact.segmentId,
            documentId: fact.documentId,
            quote: fact.quote,
            line: ClaimLine.parse(line),
          },
        ]
      : [];
  });
}

const fold = (value: string) => value.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

export function medicationUiLists(
  facts: Fact[],
  lines: DisplayLine[],
  asOf: string,
  list: "latest" | "all" = "latest",
): UiToolOutputs["show_medications"] {
  const byId = new Map(lines.map((line) => [line.factId, line]));
  const groups = new Map<string, UiToolOutputs["show_medications"]["lists"][number]>();
  const medications: { fact: Fact; row: z.infer<typeof MedicationRow>; generic: string }[] = [];
  for (const fact of facts) {
    const parsed = MedicationAttrs.safeParse(fact.attrs);
    const line = byId.get(fact.id);
    if (fact.kind !== "medication" || !parsed.success || !line) continue;
    const attrs = parsed.data;
    const source = /\bcurrent\b/i.test(attrs.listLabel) ? "Medication list" : attrs.listLabel;
    const dateLabel = formatDate(fact.docDate);
    const listLabel = source.includes(dateLabel) ? source : `${source}, ${dateLabel}`;
    const key = `${fact.documentId}:${source}`;
    const group = groups.get(key) ?? {
      listLabel,
      documentId: fact.documentId,
      date: fact.docDate,
      lines: [],
    };
    const row = { ...line, schedule: medicationSchedule(attrs.schedule, attrs.scheduleText) };
    group.lines.push(row);
    groups.set(key, group);
    if (
      fact.assertion === "present" &&
      fact.temporalStatus !== "given_once" &&
      fact.temporalStatus !== "planned" &&
      fact.temporalStatus !== "recommended"
    ) {
      medications.push({ fact, row, generic: fold(attrs.generic) });
    }
  }
  const lists = [...groups.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || a.documentId.localeCompare(b.documentId),
  );
  const changes: UiToolOutputs["show_medications"]["changes"] = [];
  const ordered = medications.sort((a, b) => a.fact.docDate.localeCompare(b.fact.docDate));
  const previous = new Map<string, (typeof medications)[number]>();
  for (const entry of ordered) {
    const before = previous.get(entry.generic);
    if (
      before &&
      before.fact.docDate !== entry.fact.docDate &&
      (before.row.schedule !== entry.row.schedule ||
        before.fact.attrs.strength !== entry.fact.attrs.strength ||
        before.fact.attrs.route !== entry.fact.attrs.route)
    ) {
      changes.push({
        fromDate: before.fact.docDate,
        toDate: entry.fact.docDate,
        from: before.row,
        to: entry.row,
      });
    }
    previous.set(entry.generic, entry);
  }
  return {
    asOf,
    lists: list === "all" ? lists : lists.filter((group) => group.date === lists[0]?.date),
    changes,
  };
}

/** Numeric chart values come from checked fields; planned/negative measurements never become points. */
export function labUiPoints(facts: Fact[], lines: DisplayLine[], measure: string) {
  const patterns: Record<string, RegExp> = {
    weight: /\b(weight|gewicht|korpergewicht)\b/,
    hba1c: /\bhba1c\b/,
    blood_pressure: /blood pressure|blutdruck|\brr\b/,
    bmi: /\bbmi\b|body mass index/,
  };
  const query = fold(measure.replaceAll("_", " "));
  const byId = new Map(lines.map((line) => [line.factId, line]));
  const points: z.infer<typeof TrendPoint>[] = [];
  for (const fact of facts) {
    const label = fold(fact.labelEn);
    const line = byId.get(fact.id);
    if (
      !line ||
      !["lab", "measurement"].includes(fact.kind) ||
      fact.assertion !== "present" ||
      ["planned", "recommended"].includes(fact.temporalStatus) ||
      !(patterns[measure]?.test(label) ?? label.includes(query))
    )
      continue;
    const raw = String(fact.attrs.value ?? "").trim();
    const unit = typeof fact.attrs.unit === "string" ? fact.attrs.unit : "";
    const bp = measure === "blood_pressure" ? raw.match(/^(\d+)\s*\/\s*(\d+)$/) : null;
    const values = bp
      ? [
          ["systolic", bp[1]],
          ["diastolic", bp[2]],
        ]
      : [[measure, raw]];
    for (const [series, value] of values) {
      if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(value)) continue;
      const number = Number(value.replace(",", "."));
      if (!Number.isFinite(number)) continue;
      points.push({
        date: fact.eventDate ?? fact.docDate,
        value: number,
        unit,
        series,
        factId: fact.id,
        segmentId: fact.segmentId,
        quote: fact.quote,
        line: line.line,
      });
    }
  }
  return points.sort((a, b) => a.date.localeCompare(b.date) || a.factId.localeCompare(b.factId));
}

export function uiTools(ctx: UiToolContext) {
  let sourcesJob: Promise<Sources> | undefined;
  const sources = () =>
    (sourcesJob ??= Promise.all([
      loadFacts(ctx.window, undefined, ctx.patientId),
      loadSegments(ctx.window, ctx.patientId),
    ]).then(([facts, segments]) => ({ facts: locatedUiFacts(facts, segments), segments })));
  const run = async <K extends keyof UiToolOutputs>(
    name: K,
    execute: () => Promise<UiToolOutputs[K]>,
  ) => {
    await verifyWindow(ctx);
    const output = await execute();
    await assertWindowCurrent(ctx.window, ctx.patientId);
    return UiToolSchemas[name].parse(output) as UiToolOutputs[K];
  };
  return {
    open_lens: tool({
      description:
        "Open source-linked situation cards for a clinical role and task. Card text is rendered by templates.",
      inputSchema: z.object({
        text: z.string().trim().min(1).max(2000),
        chipId: z.string().optional(),
      }),
      outputSchema: UiToolSchemas.open_lens,
      execute: ({ text, chipId }) =>
        run("open_lens", async () => {
          if (ctx.patientId !== PATIENT_ID)
            throw new Error("Situation lenses currently support the default patient only");
          const events: LensEvent[] = [];
          for await (const event of streamLens({
            text,
            chipId,
            asOf: ctx.window.asOf,
            sessionId: ctx.sessionId,
          })) {
            if (event.type === "error") throw new Error(event.message);
            if (
              event.type === "situation" &&
              (event.window.asOf !== ctx.window.asOf ||
                event.window.corpusRevision !== ctx.window.corpusRevision ||
                JSON.stringify([...event.window.eligibleDocumentIds].sort()) !==
                  JSON.stringify([...ctx.window.eligibleDocumentIds].sort()))
            ) {
              throw new Error("Situation requested a different evidence window");
            }
            if (event.type !== "headline") events.push(event);
          }
          const screen = screenFromEvents(events);
          return UiToolSchemas.open_lens.parse(screen);
        }),
    }),
    show_patient_summary: tool({
      description:
        "Show documented demographics, category counts and critical source-linked facts.",
      inputSchema: z.object({}),
      outputSchema: UiToolSchemas.show_patient_summary,
      execute: () =>
        run("show_patient_summary", async () => {
          const data = await sources();
          const lines = await displayLines(data.facts, data, ctx);
          const ids = (kind: string) =>
            new Set(data.facts.filter((fact) => fact.kind === kind).map((fact) => fact.id));
          const demographicIds = ids("demographic");
          const criticalIds = new Set(
            data.facts
              .filter(
                (fact) =>
                  fact.kind === "allergy" ||
                  (fact.kind === "medication" &&
                    /anticoagul|antiplatelet|acetylsalicylic|heparin|warfarin|apixaban|rivaroxaban|clopidogrel/i.test(
                      `${fact.labelEn} ${JSON.stringify(fact.attrs)}`,
                    )),
              )
              .map((fact) => fact.id),
          );
          return {
            patientId: ctx.patientId,
            asOf: ctx.window.asOf,
            documentCount: ctx.window.eligibleDocumentIds.length,
            demographics: lines.filter((line) => demographicIds.has(line.factId)),
            counts: FactKind.options.map((kind) => ({ kind, count: ids(kind).size })),
            criticalFacts: lines.filter((line) => criticalIds.has(line.factId)),
          };
        }),
    }),
    show_medications: tool({
      description:
        "Show source-labelled medication lists and documented changes between lists, never infer current medication.",
      inputSchema: z.object({ list: z.enum(["latest", "all"]).optional() }),
      outputSchema: UiToolSchemas.show_medications,
      execute: ({ list }) =>
        run("show_medications", async () => {
          const data = await sources();
          const facts = data.facts.filter((fact) => fact.kind === "medication");
          return medicationUiLists(
            facts,
            await displayLines(facts, data, ctx),
            ctx.window.asOf,
            list,
          );
        }),
    }),
    show_lab_trend: tool({
      description:
        "Plot documented weight, HbA1c, blood pressure, BMI or another named measurement with source links.",
      inputSchema: z.object({ measure: z.string().trim().min(1).max(160) }),
      outputSchema: UiToolSchemas.show_lab_trend,
      execute: ({ measure }) =>
        run("show_lab_trend", async () => {
          const data = await sources();
          const lines = await displayLines(
            data.facts.filter((fact) => ["lab", "measurement"].includes(fact.kind)),
            data,
            ctx,
          );
          const points = labUiPoints(data.facts, lines, measure);
          const selectedIds = new Set(points.map((point) => point.factId));
          const selected = data.facts.filter((fact) => selectedIds.has(fact.id));
          const deltas = trendLines(selected, ctx).filter((line) => line.factIds.length > 1);
          const checked = await validateClaims(deltas, { ...ctx, ...data });
          return {
            measure,
            asOf: ctx.window.asOf,
            points,
            deltaLine: checked.find(isShowable) ?? null,
          };
        }),
    }),
    show_timeline: tool({
      description:
        "Show dated source-linked events; planned and recommended events keep their status.",
      inputSchema: z.object({ kinds: z.array(FactKind).optional() }),
      outputSchema: UiToolSchemas.show_timeline,
      execute: ({ kinds }) =>
        run("show_timeline", async () => {
          const data = await sources();
          const facts = data.facts.filter((fact) => !kinds?.length || kinds.includes(fact.kind));
          const byId = new Map(facts.map((fact) => [fact.id, fact]));
          const lines = await displayLines(facts, data, ctx);
          return {
            asOf: ctx.window.asOf,
            events: lines
              .flatMap((line) => {
                const fact = byId.get(line.factId);
                return fact
                  ? [{ ...line, date: fact.eventDate ?? fact.docDate, kind: fact.kind }]
                  : [];
              })
              .sort((a, b) => a.date.localeCompare(b.date) || a.factId.localeCompare(b.factId)),
          };
        }),
    }),
    show_findings: tool({
      description:
        "Compare adjudicated contradictions and needs-clarification findings with all eligible passages.",
      inputSchema: z.object({ topic: z.string().optional() }),
      outputSchema: UiToolSchemas.show_findings,
      execute: ({ topic }) =>
        run("show_findings", async () => ({
          asOf: ctx.window.asOf,
          findings: (await loadFindings(ctx.window, ctx.patientId)).filter(
            (finding) =>
              !topic || fold(`${finding.title} ${finding.explanation}`).includes(fold(topic)),
          ),
        })),
    }),
    show_passage: tool({
      description: "Show an eligible German source passage, translation and neighbouring segments.",
      inputSchema: z.object({ segmentId: z.string().min(1) }),
      outputSchema: UiToolSchemas.show_passage,
      execute: ({ segmentId }) =>
        run("show_passage", async () => {
          const [data, documents] = await Promise.all([
            sources(),
            loadDocuments(ctx.window, ctx.patientId),
          ]);
          const source = data.segments.find((segment) => segment.id === segmentId);
          const document = documents.find((doc) => doc.id === source?.documentId);
          if (!document) throw new Error("Passage is outside this patient's evidence window");
          return passageContext(
            {
              document,
              segments: data.segments
                .filter((segment) => segment.documentId === document.id)
                .sort((a, b) => a.start - b.start),
            },
            segmentId,
          );
        }),
    }),
    check_documented: tool({
      description:
        "Check all eligible documents before declaring a concept not documented. Failure means couldn't check.",
      inputSchema: z.object({ concept: z.string().trim().min(1).max(500) }),
      outputSchema: UiToolSchemas.check_documented,
      execute: ({ concept }) =>
        run("check_documented", async () => {
          const [documents, data, total] = await Promise.all([
            loadDocuments(ctx.window, ctx.patientId),
            sources(),
            documentCount(ctx.patientId),
          ]);
          return checkDocumented(concept, conceptSynonyms(concept), ctx.window, {
            documents,
            segments: data.segments,
            total,
            candidateSearch: (query) =>
              hybridSearch(query, ctx.window, { patientId: ctx.patientId, k: 60 }).then((hits) =>
                hits.map((hit) => hit.segmentId),
              ),
          });
        }),
    }),
    draft_letter: tool({
      description:
        "Build the validated, source-linked GP follow-up letter for this session and evidence window.",
      inputSchema: z.object({}),
      outputSchema: UiToolSchemas.draft_letter,
      execute: () =>
        run("draft_letter", async () => {
          if (ctx.patientId !== PATIENT_ID)
            throw new Error("GP letters currently support the default patient only");
          return buildLetter({
            sessionId: ctx.sessionId,
            asOf: ctx.window.asOf,
            corpusRevision: ctx.window.corpusRevision,
          });
        }),
    }),
  };
}
