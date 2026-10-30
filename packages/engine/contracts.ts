import { z } from "zod";

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const SegmentKind = z.enum(["sentence", "table_row", "list_item", "heading"]);
export const Assertion = z.enum(["present", "negated", "suspected", "historical"]);
export const TemporalStatus = z.enum([
  "planned",
  "recommended",
  "done",
  "ongoing",
  "given_once",
  "stated",
]);
export const DatePrecision = z.enum(["day", "month", "year", "approx"]);
export const Support = z.enum(["supported", "partial", "unsupported", "exempt"]);
export const Availability = z.enum(["documented", "not_documented", "unavailable"]);
export const Completeness = z.enum(["complete", "partial"]);
export const Conflict = z.enum(["none", "contradicted", "needs_clarification"]);
export const ReviewAction = z.enum(["accept", "correct", "dismiss", "leave_open"]);
export const DismissReason = z.enum([
  "change_over_time",
  "measurement_variation",
  "different_context",
  "extraction_error",
  "not_relevant",
  "other",
]);

export const FactKind = z.enum([
  "diagnosis",
  "medication",
  "allergy",
  "procedure",
  "measurement",
  "lab",
  "imaging",
  "histology",
  "receptor",
  "staging",
  "symptom",
  "event",
  "recommendation",
  "family_history",
  "social_history",
  "demographic",
]);

export const Document = z.object({
  id: z.string(),
  patientId: z.string(),
  revisionId: z.string(),
  title: z.string(),
  titleEn: z.string(),
  docType: z.string(),
  docDate: IsoDate,
  department: z.string(),
});

export const Segment = z.object({
  id: z.string(),
  documentId: z.string(),
  kind: SegmentKind,
  section: z.string().nullable(),
  start: z.number().int(),
  end: z.number().int(),
  text: z.string(),
  textEn: z.string().nullable(),
});

/** Schedule columns are morning, midday, evening, night, kept as written ("1", "0", "1/2", "ST"). */
export const MedicationAttrs = z.object({
  generic: z.string(),
  brand: z.string().nullable(),
  strength: z.string().nullable(),
  unit: z.string().nullable(),
  route: z.string().nullable(),
  schedule: z.tuple([z.string(), z.string(), z.string(), z.string()]).nullable(),
  scheduleText: z.string().nullable(),
  listLabel: z.string(),
  atc: z.string().nullable(),
});

export const Fact = z.object({
  id: z.string(),
  segmentId: z.string(),
  documentId: z.string(),
  kind: FactKind,
  labelEn: z.string(),
  attrs: z.record(z.string(), z.unknown()),
  assertion: Assertion,
  temporalStatus: TemporalStatus,
  eventDate: z.string().nullable(),
  datePrecision: DatePrecision.nullable(),
  dueDate: z.string().nullable(),
  docDate: IsoDate,
  quote: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  entityId: z.string().nullable(),
  locationOk: z.literal(true),
  support: Support,
  negationFlag: z.boolean(),
  contentHash: z.string(),
  validatorVersion: z.string(),
});

export const Validation = z.object({
  key: z.string(),
  support: Support,
  negationFlag: z.boolean().optional(),
});

export const Claim = z.object({
  id: z.string(),
  kind: z.enum(["template", "composed", "absence", "annotation", "boilerplate"]),
  text: z.string(),
  factIds: z.array(z.string()),
  segmentIds: z.array(z.string()),
  author: z.enum(["machine", "clinician"]),
  validation: Validation,
});

export const ClaimLine = Claim.extend({
  assertion: Assertion,
  temporalStatus: TemporalStatus,
  asOf: z.string().optional(),
});

export const Searched = z.object({
  eligible: z.number().int(),
  total: z.number().int(),
  asOf: IsoDate,
});

export const CardReview = z.object({
  action: z.enum(["accepted", "corrected", "dismissed", "left_open", "needs_rereview"]),
  at: z.string(),
});

export const Card = z.object({
  id: z.string(),
  needId: z.string(),
  title: z.string(),
  why: z.string(),
  cardType: z.enum(["facts", "medication_list", "trend", "gap"]),
  critical: z.boolean(),
  availability: Availability,
  completeness: Completeness,
  missing: z.array(z.string()).optional(),
  conflict: Conflict,
  findingIds: z.array(z.string()),
  headline: Claim.optional(),
  lines: z.array(ClaimLine),
  searched: Searched.optional(),
  review: CardReview.optional(),
});

export const FindingPassage = z.object({
  segmentId: z.string(),
  documentId: z.string(),
  factId: z.string().nullable(),
  quote: z.string(),
  start: z.number().int(),
  end: z.number().int(),
  claimEn: z.string(),
});

export const Finding = z.object({
  id: z.string(),
  type: z.enum(["contradiction", "needs_clarification"]),
  title: z.string(),
  explanation: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  computation: z.string().nullable(),
  hypothesisText: z.string().nullable(),
  passages: z.array(FindingPassage).min(2),
  review: CardReview.optional(),
});

export const OpenQuestion = z.object({
  id: z.string(),
  kind: z.enum(["contradiction", "needs_clarification", "missing"]),
  title: z.string(),
  findingId: z.string().optional(),
  cardId: z.string().optional(),
  needId: z.string().optional(),
  review: CardReview.optional(),
});

export const Situation = z.object({
  role: z.string(),
  task: z.string(),
  procedure: z.string().optional(),
  procedureDate: IsoDate.optional(),
  asOf: IsoDate,
  concerns: z.array(z.string()),
  profileId: z.string().nullable(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const EvidenceWindow = z.object({
  asOf: IsoDate,
  eligibleDocumentIds: z.array(z.string()),
  corpusRevision: z.string(),
});

export const Patient = z.object({
  id: z.string(),
  displayName: z.string(),
  sex: z.enum(["F", "M", "X"]),
  birthDate: IsoDate,
  birthDateQuote: z.string(),
  birthDateSegmentId: z.string().nullable(),
});

export const Section = z.object({
  id: z.string(),
  title: z.string(),
  cards: z.array(Card),
});

export const Timings = z.object({
  planMs: z.number(),
  firstSectionMs: z.number().optional(),
  totalMs: z.number(),
  cached: z.boolean(),
});

export const Screen = z.object({
  lensKey: z.string(),
  patient: Patient,
  situation: Situation,
  window: EvidenceWindow,
  critical: z.array(z.string()),
  sections: z.array(Section),
  findings: z.array(Finding),
  openQuestions: z.array(OpenQuestion),
  timings: Timings,
});

export const LensRequest = z.object({
  text: z.string().min(1),
  asOf: IsoDate.optional(),
  sessionId: z.string().optional(),
  noCache: z.boolean().optional(),
});

/** `/api/lens` streams one JSON object per line in this order: situation, sections as they finish, headlines, findings, done. */
export const LensEvent = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("situation"),
    lensKey: z.string(),
    patient: Patient,
    situation: Situation,
    window: EvidenceWindow,
    sectionTitles: z.array(z.object({ id: z.string(), title: z.string() })),
  }),
  z.object({ type: z.literal("section"), section: Section }),
  z.object({ type: z.literal("headline"), cardId: z.string(), headline: Claim }),
  z.object({
    type: z.literal("findings"),
    critical: z.array(z.string()),
    findings: z.array(Finding),
    openQuestions: z.array(OpenQuestion),
  }),
  z.object({ type: z.literal("done"), timings: Timings }),
  z.object({ type: z.literal("error"), message: z.string(), retryable: z.boolean() }),
]);

export const PassageView = z.object({
  document: Document,
  segment: Segment,
  before: z.array(Segment),
  after: z.array(Segment),
});

export const DocumentView = z.object({
  document: Document,
  segments: z.array(Segment),
});

export const ReviewTargetType = z.enum(["fact", "finding", "card", "open_question", "letter_claim"]);

export const ReviewRequest = z.object({
  sessionId: z.string(),
  targetType: ReviewTargetType,
  targetId: z.string(),
  targetHash: z.string(),
  action: ReviewAction,
  reason: DismissReason.optional(),
  reasonText: z.string().optional(),
  proposedText: z.string().optional(),
  author: z.string(),
});

export const ReviewEntry = ReviewRequest.extend({
  id: z.string(),
  supportResult: Support.nullable(),
  createdAt: z.string(),
});

export const LetterFlag = z.object({
  reason: z.enum(["fact_corrected", "finding_dismissed", "source_changed", "edit_unsupported"]),
  reviewId: z.string(),
  proposedText: z.string().optional(),
});

export const LetterClaim = Claim.extend({ flag: LetterFlag.optional() });

export const LetterSection = z.object({
  id: z.enum([
    "header",
    "reason",
    "recommendations",
    "completion",
    "clarification",
    "since_then",
    "medication",
    "clinician_notes",
    "closing",
  ]),
  title: z.string(),
  claims: z.array(LetterClaim),
});

export const Annotation = z.object({
  id: z.string(),
  text: z.string(),
  author: z.string(),
  targetId: z.string().optional(),
  createdAt: z.string(),
});

export const Letter = z.object({
  id: z.string(),
  sessionId: z.string(),
  lensKey: z.string(),
  asOf: IsoDate,
  sections: z.array(LetterSection),
  annotations: z.array(Annotation),
  createdAt: z.string(),
  generationMs: z.number(),
});

export const LetterEditRequest = z.object({
  sessionId: z.string(),
  letterId: z.string(),
  claimId: z.string(),
  text: z.string(),
  author: z.string(),
});

export const AbsenceResult = z.object({
  status: Availability,
  concept: z.string(),
  searched: Searched,
  segmentIds: z.array(z.string()),
});

export const FactSummary = Fact.pick({
  id: true,
  kind: true,
  labelEn: true,
  attrs: true,
  assertion: true,
  temporalStatus: true,
  eventDate: true,
  docDate: true,
  quote: true,
  segmentId: true,
  documentId: true,
});

export const AgentTools = {
  search_facts: {
    input: z.object({ query: z.string(), kinds: z.array(FactKind).optional() }),
    output: z.object({ facts: z.array(FactSummary) }),
  },
  get_passage: {
    input: z.object({ segmentId: z.string() }),
    output: PassageView,
  },
  check_documented: {
    input: z.object({ concept: z.string() }),
    output: AbsenceResult,
  },
  list_findings: {
    input: z.object({ topic: z.string().optional() }),
    output: z.object({ findings: z.array(Finding) }),
  },
  timeline: {
    input: z.object({ entityOrKind: z.string() }),
    output: z.object({
      points: z.array(
        z.object({ date: z.string(), text: z.string(), factId: z.string(), segmentId: z.string() }),
      ),
    }),
  },
  calculate: {
    input: z.object({ expression: z.string(), factIds: z.array(z.string()) }),
    output: z.object({ value: z.number(), formula: z.string(), factIds: z.array(z.string()) }),
  },
  show_source: {
    input: z.object({ segmentId: z.string() }),
    output: z.object({ ok: z.boolean() }),
  },
  add_to_letter: {
    input: z.object({ claimIds: z.array(z.string()) }),
    output: z.object({ ok: z.boolean() }),
  },
} as const;

export const Need = z.object({
  id: z.string(),
  title: z.string(),
  why: z.string(),
  kinds: z.array(FactKind),
  cardType: Card.shape.cardType,
  critical: z.boolean(),
  synonyms: z.array(z.string()),
  requiredFields: z.array(z.string()).optional(),
});

export const Profile = z.object({
  id: z.string(),
  role: z.string(),
  matches: z.array(z.string()),
  sections: z.array(z.object({ id: z.string(), title: z.string(), needIds: z.array(z.string()) })),
});

export type SegmentKind = z.infer<typeof SegmentKind>;
export type Assertion = z.infer<typeof Assertion>;
export type TemporalStatus = z.infer<typeof TemporalStatus>;
export type Support = z.infer<typeof Support>;
export type Availability = z.infer<typeof Availability>;
export type FactKind = z.infer<typeof FactKind>;
export type Document = z.infer<typeof Document>;
export type Segment = z.infer<typeof Segment>;
export type MedicationAttrs = z.infer<typeof MedicationAttrs>;
export type Fact = z.infer<typeof Fact>;
export type Claim = z.infer<typeof Claim>;
export type ClaimLine = z.infer<typeof ClaimLine>;
export type Card = z.infer<typeof Card>;
export type Finding = z.infer<typeof Finding>;
export type FindingPassage = z.infer<typeof FindingPassage>;
export type OpenQuestion = z.infer<typeof OpenQuestion>;
export type Situation = z.infer<typeof Situation>;
export type EvidenceWindow = z.infer<typeof EvidenceWindow>;
export type Patient = z.infer<typeof Patient>;
export type Section = z.infer<typeof Section>;
export type Screen = z.infer<typeof Screen>;
export type LensRequest = z.infer<typeof LensRequest>;
export type LensEvent = z.infer<typeof LensEvent>;
export type PassageView = z.infer<typeof PassageView>;
export type DocumentView = z.infer<typeof DocumentView>;
export type ReviewRequest = z.infer<typeof ReviewRequest>;
export type ReviewEntry = z.infer<typeof ReviewEntry>;
export type Letter = z.infer<typeof Letter>;
export type LetterClaim = z.infer<typeof LetterClaim>;
export type LetterSection = z.infer<typeof LetterSection>;
export type Annotation = z.infer<typeof Annotation>;
export type AbsenceResult = z.infer<typeof AbsenceResult>;
export type FactSummary = z.infer<typeof FactSummary>;
export type Need = z.infer<typeof Need>;
export type Profile = z.infer<typeof Profile>;
