import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

export const corpusRevisions = pgTable("corpus_revisions", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  documentsHash: text("documents_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    revisionId: text("revision_id")
      .notNull()
      .references(() => corpusRevisions.id),
    title: text("title").notNull(),
    titleEn: text("title_en").notNull(),
    docType: text("doc_type").notNull(),
    docDate: date("doc_date").notNull(),
    department: text("department").notNull(),
    rawText: text("raw_text").notNull(),
    normText: text("norm_text").notNull(),
    offsetMap: jsonb("offset_map").$type<number[]>().notNull(),
  },
  (t) => [index("documents_patient_idx").on(t.patientId, t.docDate)],
);

export const segments = pgTable(
  "segments",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    kind: text("kind", { enum: ["sentence", "table_row", "list_item", "heading"] }).notNull(),
    section: text("section"),
    ordinal: integer("ordinal").notNull(),
    start: integer("start").notNull(),
    end: integer("end").notNull(),
    text: text("text").notNull(),
    textEn: text("text_en"),
  },
  (t) => [index("segments_document_idx").on(t.documentId, t.ordinal)],
);

export const entities = pgTable("entities", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  kind: text("kind").notNull(),
  canonicalEn: text("canonical_en").notNull(),
  eventKey: text("event_key"),
  codes: jsonb("codes").$type<{ icd10?: string; atc?: string }>().notNull().default({}),
});

export const facts = pgTable(
  "facts",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    segmentId: text("segment_id")
      .notNull()
      .references(() => segments.id),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id),
    kind: text("kind").notNull(),
    labelEn: text("label_en").notNull(),
    attrs: jsonb("attrs").$type<Record<string, unknown>>().notNull(),
    assertion: text("assertion").notNull(),
    temporalStatus: text("temporal_status").notNull(),
    eventDate: text("event_date"),
    datePrecision: text("date_precision"),
    dueDate: text("due_date"),
    docDate: date("doc_date").notNull(),
    quote: text("quote").notNull(),
    start: integer("start").notNull(),
    end: integer("end").notNull(),
    entityId: text("entity_id").references(() => entities.id),
    locationOk: boolean("location_ok").notNull(),
    support: text("support").notNull(),
    negationFlag: boolean("negation_flag").notNull(),
    contentHash: text("content_hash").notNull(),
    validatorVersion: text("validator_version").notNull(),
  },
  (t) => [
    index("facts_patient_kind_idx").on(t.patientId, t.kind),
    index("facts_segment_idx").on(t.segmentId),
  ],
);

export const findings = pgTable("findings", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  revisionId: text("revision_id")
    .notNull()
    .references(() => corpusRevisions.id),
  type: text("type", {
    enum: ["contradiction", "needs_clarification", "dismissed_candidate"],
  }).notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  severity: text("severity", { enum: ["high", "medium", "low"] }).notNull(),
  computation: text("computation"),
  hypothesisText: text("hypothesis_text"),
});

export const findingPassages = pgTable(
  "finding_passages",
  {
    findingId: text("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    segmentId: text("segment_id")
      .notNull()
      .references(() => segments.id),
    factId: text("fact_id").references(() => facts.id),
    quote: text("quote").notNull(),
    start: integer("start").notNull(),
    end: integer("end").notNull(),
    claimEn: text("claim_en").notNull(),
  },
  (t) => [primaryKey({ columns: [t.findingId, t.segmentId, t.start] })],
);

export const validations = pgTable("validations", {
  cacheKey: text("cache_key").primaryKey(),
  patientId: text("patient_id").notNull(),
  verdict: text("verdict").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviews = pgTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    sessionId: text("session_id").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    targetHash: text("target_hash").notNull(),
    action: text("action").notNull(),
    reason: text("reason"),
    reasonText: text("reason_text"),
    proposedText: text("proposed_text"),
    supportResult: text("support_result"),
    author: text("author").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_session_idx").on(t.patientId, t.sessionId, t.createdAt)],
);

export const lensCache = pgTable("lens_cache", {
  key: text("key").primaryKey(),
  patientId: text("patient_id").notNull(),
  screen: jsonb("screen").notNull(),
  timings: jsonb("timings").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const letters = pgTable("letters", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  sessionId: text("session_id").notNull(),
  lensKey: text("lens_key").notNull(),
  claims: jsonb("claims").notNull(),
  annotations: jsonb("annotations").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const segmentEmbeddings = pgTable(
  "segment_embeddings",
  {
    segmentId: text("segment_id")
      .primaryKey()
      .references(() => segments.id, { onDelete: "cascade" }),
    patientId: text("patient_id").notNull(),
    model: text("model").notNull(),
    dim: integer("dim").notNull(),
    embedding: vector("embedding", { dimensions: 768 }).notNull(),
  },
  (t) => [
    index("segment_embeddings_patient_idx").on(t.patientId),
    index("segment_embeddings_cosine_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const pageAssets = pgTable(
  "page_assets",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    page: integer("page").notNull(),
    kind: text("kind").notNull(),
    uri: text("uri").notNull(),
    ocrText: text("ocr_text"),
    bbox: jsonb("bbox").$type<Record<string, unknown> | number[]>(),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (t) => [
    index("page_assets_document_idx").on(t.patientId, t.documentId, t.page),
    index("page_assets_cosine_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  ],
);

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    patientId: text("patient_id").notNull(),
    title: text("title").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chats_patient_updated_idx").on(t.patientId, t.updatedAt)],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    parts: jsonb("parts").$type<Record<string, unknown>[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_chat_created_idx").on(t.chatId, t.createdAt)],
);
