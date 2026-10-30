import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import type { LensEvent } from "../contracts.ts";
import { getDb } from "../db/client.ts";
import { documents as documentTable, facts as factTable } from "../db/schema.ts";
import { CHIPS } from "../lens/needs/profiles.ts";
import { screenFromEvents } from "../lens/screen.ts";
import { streamLens } from "../lens/stream.ts";
import { evidenceWindow, loadEvidence, PATIENT_ID } from "../store.ts";

const live = process.env.MEDLYN_LIVE_ISOLATION === "1" && Boolean(process.env.DATABASE_URL);

describe.skipIf(!live)("live synthetic patient isolation", () => {
  it("never includes another patient's evidence in a synthetic lens", async () => {
    const available = await getDb().selectDistinct({ id: factTable.patientId }).from(factTable);
    const patientIds = available
      .map((row) => row.id)
      .filter((id) => id.startsWith("synth-"))
      .slice(0, 2);
    expect(patientIds.length).toBe(2);
    for (const patientId of patientIds) {
      const window = await evidenceWindow(undefined, patientId);
      const evidence = await loadEvidence(window, patientId);
      const ownFacts = new Set(evidence.facts.map((fact) => fact.id));
      const ownSegments = new Set(evidence.segments.map((segment) => segment.id));
      expect(evidence.documents.every((document) => document.patientId === patientId)).toBe(true);
      const other = await getDb()
        .select({ id: factTable.id })
        .from(factTable)
        .where(eq(factTable.patientId, PATIENT_ID));
      const otherFacts = new Set(other.map((fact) => fact.id));
      const events: LensEvent[] = [];
      for await (const event of streamLens({
        patientId,
        text: CHIPS[0].text,
        chipId: CHIPS[0].id,
        asOf: window.asOf,
        noCache: true,
      }))
        events.push(event);
      const screen = screenFromEvents(events);
      expect(
        screen.sections
          .flatMap((section) => section.cards)
          .flatMap((card) => card.lines)
          .filter((claim) => claim.factIds.length).length,
      ).toBeGreaterThan(0);
      expect(screen.patient.id).toBe(patientId);
      expect(screen.window).toEqual(window);
      expect(ownSegments.has(screen.patient.birthDateSegmentId!)).toBe(true);
      for (const card of screen.sections.flatMap((section) => section.cards)) {
        for (const claim of [...card.lines, ...(card.headline ? [card.headline] : [])]) {
          expect(claim.factIds.every((id) => ownFacts.has(id) && !otherFacts.has(id))).toBe(true);
          expect(claim.segmentIds.every((id) => ownSegments.has(id))).toBe(true);
        }
      }
      for (const finding of screen.findings) {
        expect(finding.passages.every((passage) => ownSegments.has(passage.segmentId))).toBe(true);
      }
      const realDocuments = await getDb()
        .select({ id: documentTable.id })
        .from(documentTable)
        .where(and(eq(documentTable.patientId, PATIENT_ID)));
      expect(
        screen.window.eligibleDocumentIds.some((id) => realDocuments.some((doc) => doc.id === id)),
      ).toBe(false);
    }
  }, 90_000);
});
