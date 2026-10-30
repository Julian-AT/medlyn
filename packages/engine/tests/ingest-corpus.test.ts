import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatDate } from "../dates.ts";
import { loadCorpus } from "../ingest/corpus.ts";
import { contentHash, factId } from "../ingest/hash.ts";
import { parseMedicationTables } from "../ingest/medication.ts";
import { normalise } from "../ingest/normalise.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const envFile = path.join(repoRoot, ".env");
const configured = process.env.MEDLYN_DATA_PATH ?? (existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")).MEDLYN_DATA_PATH : undefined);
const dataPath = configured ? path.resolve(repoRoot, configured) : undefined;
const available = Boolean(dataPath && existsSync(path.join(dataPath, "documents.json")));

describe.skipIf(!available)("runtime challenge corpus", () => {
  it("loads all eight documents with stable corpus identity and located birth date", () => {
    const corpus = loadCorpus(dataPath);
    expect(corpus.documents).toHaveLength(8);
    expect(corpus.documentsHash).toHaveLength(64);
    expect(corpus.revisionId).toBe(`rev-${corpus.documentsHash.slice(0, 12)}`);
    expect(loadCorpus(dataPath).documentsHash).toBe(corpus.documentsHash);
    expect(corpus.patient.displayName).toBe("Anna Musterfrau");
    expect(corpus.patient.sex).toBe("F");
    const birth = corpus.documents.flatMap((d) => d.segments).find((s) => s.id === corpus.patient.birthDateSegmentId);
    expect(birth?.text.includes(corpus.patient.birthDateQuote)).toBe(true);
    const metadata = JSON.parse(readFileSync(path.join(dataPath!, "patient.json"), "utf8"));
    expect(corpus.patient.birthDate).toBe(metadata.dateOfBirth);
    const manifest = JSON.parse(readFileSync(path.join(dataPath!, "documents.json"), "utf8")).documents;
    for (const cd of corpus.documents) {
      const meta = manifest.find((d: { id: string }) => d.id === cd.doc.id);
      expect(cd.doc.docDate).toBe(meta.date);
      expect(cd.doc.docType).toBe(meta.type);
      expect(cd.doc.department).toBe(meta.department);
      expect(cd.doc.revisionId).toBe(corpus.revisionId);
    }
  });

  it("keeps exact segment offsets and raw offset round trips in every document", () => {
    for (const cd of loadCorpus(dataPath).documents) {
      expect(cd.offsetMap).toHaveLength(cd.normText.length + 1);
      expect(cd.offsetMap.at(-1)).toBe(cd.rawText.length);
      for (const [ordinal, s] of cd.segments.entries()) {
        expect(s.id).toBe(`${cd.doc.id}-s${ordinal}`);
        expect(s.ordinal).toBe(ordinal);
        expect(cd.normText.slice(s.start, s.end)).toBe(s.text);
        expect(normalise(cd.rawText.slice(cd.offsetMap[s.start], cd.offsetMap[s.end])).text).toBe(s.text);
        expect(s.textEn).toBe(null);
        expect(s.start).toBeGreaterThanOrEqual(ordinal ? cd.segments[ordinal - 1].end : 0);
      }
    }
  });

  it("parses eight medication facts per discharge list with exact source spans", () => {
    const lists = loadCorpus(dataPath).documents.map((cd) => ({ cd, facts: parseMedicationTables(cd, "test-det-v1") })).filter(({ facts }) => facts.length);
    expect(lists).toHaveLength(2);
    for (const { cd, facts } of lists) {
      expect(facts).toHaveLength(8);
      for (const f of facts) {
        expect(cd.normText.slice(f.start, f.end)).toBe(f.quote);
        expect(f.id).toBe(factId(contentHash(f)));
        expect(f.contentHash).toBe(contentHash(f));
        expect(f.attrs.listLabel).toBe(`Discharge medication, ${formatDate(cd.doc.docDate)}`);
        expect(f.locationOk).toBe(true);
        expect(f.support).toBe("supported");
        expect(f.assertion).toBe("present");
        expect(f.temporalStatus).toBe("ongoing");
        expect(f.eventDate).toBe(cd.doc.docDate);
        expect(f.datePrecision).toBe("day");
        expect(f.validatorVersion).toBe("test-det-v1");
      }
      expect(facts.find((f) => f.attrs.generic === "Alendronic acid")?.attrs.scheduleText).toBe("1x/Woche 1 Tabl.");
      const injection = facts.find((f) => f.attrs.generic === "Exenatide")!;
      expect(injection.attrs.strength).toBe("5 mcg");
      expect(injection.attrs.route).toBe("s.c.");
      expect(injection.attrs.schedule).toEqual(["1", "0", "1", "0"]);
    }
    lists.sort((a, b) => a.cd.doc.docDate.localeCompare(b.cd.doc.docDate));
    expect(lists.map(({ facts }) => facts.find((f) => f.attrs.generic === "Candesartan")?.attrs.schedule)).toEqual([["1", "0", "1/2", "0"], ["1", "0", "1", "0"]]);
    expect(lists[0].facts.find((f) => f.attrs.generic === "Exenatide")?.attrs.scheduleText).toBe("0,5");
    expect(lists[1].facts.find((f) => f.attrs.generic === "Exenatide")?.attrs.unit).toBe("Dosen");
  });
});
