import { cacheKey } from "../claims/identity.ts";
import { VALIDATOR_VERSION } from "../claims/version.ts";
import {
  type Claim,
  type ClaimLine,
  type Document,
  type EvidenceWindow,
  type Fact,
  MedicationAttrs,
  type Need,
} from "../contracts.ts";
import { formatDate } from "../dates.ts";

export type ClaimCtx = { patientId: string; window: EvidenceWindow };
type Searched = { eligible: number; total: number; asOf: string };
const stringAttr = (fact: Fact, key: string): string | null => {
  const value = fact.attrs[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
};

export function medicationSchedule(
  schedule: [string, string, string, string] | null,
  scheduleText: string | null,
): string {
  if (!schedule) return (scheduleText ?? "").replace(/1\/2/g, "½");
  return (schedule[3].trim() === "0" ? schedule.slice(0, 3) : schedule)
    .map((dose) => dose.trim().replace(/1\/2/g, "½"))
    .join("-");
}

/** Adds source metadata to request-local copies so rendering and validation agree. */
export function withDocumentTitles(
  facts: Fact[],
  documents: Pick<Document, "id" | "titleEn">[],
): Fact[] {
  const titles = new Map(documents.map((document) => [document.id, document.titleEn]));
  return facts.map((fact) => {
    const title = titles.get(fact.documentId)?.trim();
    return title ? { ...fact, attrs: { ...fact.attrs, sourceTitle: title } } : fact;
  });
}

export function factLineText(fact: Fact): string {
  let text = fact.labelEn;
  let source = stringAttr(fact, "sourceTitle") ?? stringAttr(fact, "sourceLabel") ?? "Document";
  const date = formatDate(fact.docDate, "day");
  if (fact.kind === "medication") {
    const parsed = MedicationAttrs.safeParse(fact.attrs);
    if (parsed.success) {
      const m = parsed.data;
      const drug = `${m.generic}${m.brand && m.brand !== m.generic ? ` (${m.brand})` : ""}`;
      const dose = [
        m.strength,
        m.unit && /^(?:mg|mcg|µg|μg|g|ml)$/i.test(m.unit) && !m.strength?.includes(m.unit)
          ? m.unit
          : null,
      ]
        .filter(Boolean)
        .join(" ");
      const schedule = medicationSchedule(m.schedule, m.scheduleText);
      text = `${drug}${dose ? ` ${dose}` : ""}${schedule ? `, ${schedule}` : ""}${m.schedule && m.scheduleText ? ` (${m.scheduleText})` : ""}${m.route ? `, ${m.route}` : ""}`;
      source = /\bcurrent\b/i.test(m.listLabel) ? "Medication list" : m.listLabel;
    } else {
      source = stringAttr(fact, "listLabel") ?? "Medication list";
      if (/\bcurrent\b/i.test(source)) source = "Medication list";
    }
  } else {
    const value = stringAttr(fact, "value");
    const unit = stringAttr(fact, "unit");
    if (value && !text.includes(value)) text += ` ${value}${unit ? ` ${unit}` : ""}`;
    const allredKey = Object.keys(fact.attrs).find((key) => /^allred(?:[-_ ]?score)?$/i.test(key));
    const allred = allredKey ? stringAttr(fact, allredKey) : null;
    if (allred && !/allred/i.test(text)) text += `, Allred ${allred}`;
    const stage = stringAttr(fact, "stage");
    const normalStage = (value: string) =>
      value
        .toLowerCase()
        .replace(/\b(?:grade?|stage)\b/g, "")
        .replace(/[^a-z0-9]/g, "");
    if (stage && !normalStage(text).includes(normalStage(stage))) text += ` ${stage}`;
    const cause = stringAttr(fact, "cause");
    if (cause && !text.includes(cause)) {
      const reason =
        /^(?:(?:bekannt\w*|known)\s+)?(?:KM|Kontrastmittel|contrast(?: medium)?)[ -]?allerg(?:ie|y)$/i.test(
          cause.trim(),
        )
          ? "contrast medium allergy"
          : cause;
      text += `; reason: ${reason}`;
    }
    const side = stringAttr(fact, "side");
    if (side && !text.toLowerCase().includes(side.toLowerCase())) text += ` (${side})`;
    if (fact.eventDate && fact.eventDate !== fact.docDate) {
      const eventDate = formatDate(fact.eventDate, fact.datePrecision);
      if (!text.includes(eventDate) && !text.includes(fact.eventDate)) text += `, ${eventDate}`;
    }
  }
  if (fact.assertion === "negated" && !/\b(no|not|without|negative|absent)\b/i.test(text))
    text = `No ${text}`;
  if (fact.assertion === "suspected" && !/\b(suspected|possible|suspicious)\b/i.test(text))
    text = `Suspected: ${text}`;
  if (fact.assertion === "historical" && !/\b(history|historical|previous|prior)\b/i.test(text))
    text = `History of ${text}`;
  if (fact.temporalStatus === "planned" && !/\bplanned\b/i.test(text)) text = `Planned: ${text}`;
  if (fact.temporalStatus === "recommended" && !/\brecommended\b/i.test(text))
    text = `Recommended: ${text}`;
  if (fact.temporalStatus === "given_once") text = `Given once: ${text}`;
  if (fact.dueDate)
    text += `; due ${formatDate(fact.dueDate, fact.dueDate.length <= 7 ? null : fact.datePrecision)}`;
  return `${text} · ${source}${source.includes(date) ? "" : `, ${date}`}`;
}

function line(text: string, facts: Fact[], ctx: ClaimCtx): ClaimLine {
  const key = cacheKey({
    ...ctx.window,
    patientId: ctx.patientId,
    validatorVersion: VALIDATOR_VERSION,
    text,
    facts,
    segmentIds: facts.map((fact) => fact.segmentId),
  });
  const support = facts.some((fact) => fact.support === "unsupported" || fact.support === "exempt")
    ? "unsupported"
    : facts.some((fact) => fact.support === "partial")
      ? "partial"
      : "supported";
  return {
    id: `claim-${key.slice(0, 20)}`,
    kind: "template",
    text,
    factIds: facts.map((fact) => fact.id),
    segmentIds: [...new Set(facts.map((fact) => fact.segmentId))],
    author: "machine",
    validation: { key, support, negationFlag: facts.some((fact) => fact.negationFlag) },
    assertion: facts[0].assertion,
    temporalStatus: facts[0].temporalStatus,
    asOf: ctx.window.asOf,
  };
}

export function renderLine(fact: Fact, ctx: ClaimCtx): ClaimLine {
  return line(factLineText(fact), [fact], ctx);
}

function weight(fact: Fact): number | null {
  if (fact.kind !== "measurement" || !/\b(weight|gewicht|körpergewicht)\b/iu.test(fact.labelEn))
    return null;
  if (
    fact.assertion !== "present" ||
    fact.temporalStatus === "planned" ||
    fact.temporalStatus === "recommended"
  )
    return null;
  const value = fact.attrs.value;
  const unit = stringAttr(fact, "unit")?.toLowerCase();
  if (unit !== "kg" || (typeof value !== "number" && typeof value !== "string")) return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function trendLines(facts: Fact[], ctx: ClaimCtx): ClaimLine[] {
  const ordered = [...facts].sort(
    (a, b) =>
      (a.eventDate ?? a.docDate).localeCompare(b.eventDate ?? b.docDate) ||
      a.id.localeCompare(b.id),
  );
  const lines = ordered.map((fact) => renderLine(fact, ctx));
  const weights = ordered.filter((fact) => weight(fact) !== null);
  const first = weights[0];
  const last = weights.at(-1);
  if (
    !first ||
    !last ||
    first.id === last.id ||
    (first.eventDate ?? first.docDate) === (last.eventDate ?? last.docDate)
  )
    return lines;
  const delta = Math.round((weight(last)! - weight(first)!) * 1000) / 1000;
  const formatted = `${delta < 0 ? "−" : delta > 0 ? "+" : ""}${Math.abs(delta)}`;
  const text = `${formatted} kg, ${formatDate(first.eventDate ?? first.docDate, "month")} → ${formatDate(last.eventDate ?? last.docDate, "month")}`;
  lines.push(line(text, [first, last], ctx));
  return lines;
}

export function absenceClaim(need: Need, searched: Searched, ctx: ClaimCtx): Claim {
  const text =
    "afterDocumentDate" in need
      ? `${need.title}: no record of completion in the ${searched.eligible} eligible documents as of ${formatDate(ctx.window.asOf)}.`
      : `${need.title}: not documented as of ${formatDate(ctx.window.asOf)} · searched ${searched.eligible} of ${ctx.window.eligibleDocumentIds.length} eligible documents`;
  const key = cacheKey({
    ...ctx.window,
    patientId: ctx.patientId,
    validatorVersion: VALIDATOR_VERSION,
    text,
    facts: [],
    segmentIds: [],
  });
  return {
    id: `claim-${key.slice(0, 20)}`,
    kind: "absence",
    text,
    factIds: [],
    segmentIds: [],
    author: "machine",
    validation: { key, support: "unsupported" },
  };
}
