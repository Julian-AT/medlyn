import { describe, expect, it } from "vitest";
import { getDb } from "../db/client.ts";
import { rehash } from "../ingest/extract.ts";
import {
  buildRelabelQueries,
  prepareLabelChanges,
  relabelArgs,
  validateLabelChanges,
} from "../ingest/relabel.ts";
import { measurement, segmentFor } from "./label-series-fixtures.ts";

describe("stored label migration", () => {
  const original = measurement({ labelEn: "Gewicht 82 kg" });
  const changes = () => prepareLabelChanges([original], [segmentFor(original)]);

  it("rehashes changed labels and keeps evidence, values, dates and entities intact", () => {
    const [{ before, after }] = changes();
    expect(after.labelEn).toBe("weight 82 kg");
    expect(after.id).not.toBe(before.id);
    expect(after.id).toBe(`f-${after.contentHash.slice(0, 16)}`);
    expect({
      ...after,
      labelEn: before.labelEn,
      id: before.id,
      contentHash: before.contentHash,
      validatorVersion: before.validatorVersion,
    }).toEqual(before);
    expect(prepareLabelChanges([after], [segmentFor(after)])).toEqual([]);
  });

  it("refuses bad offsets, changed quotes, wrong documents and stale hashes", () => {
    for (const bad of [
      rehash({ ...original, start: 1 }),
      rehash({ ...original, quote: "Fabricated" }),
      { ...original, id: "stale" },
    ]) {
      expect(() => prepareLabelChanges([bad], [segmentFor(original)])).toThrow();
    }
    expect(() => prepareLabelChanges([original], [])).toThrow();
    expect(() =>
      prepareLabelChanges([original], [{ ...segmentFor(original), documentId: "other" }]),
    ).toThrow();
  });

  it("requires a supported semantic recheck and rejects clinical corrections", () => {
    const pending = changes();
    const after = pending[0].after;
    expect(validateLabelChanges(pending, [after])).toEqual(pending);
    for (const checked of [
      [],
      [{ ...after, support: "partial" as const }],
      [rehash({ ...after, attrs: { value: "99", unit: "kg" } })],
    ]) {
      expect(() => validateLabelChanges(pending, checked)).toThrow();
    }
  });

  it("writes replacements before retargeting findings and deletes old IDs last", () => {
    process.env.DATABASE_URL ??= "postgres://synthetic:synthetic@localhost/synthetic";
    const queries = buildRelabelQueries(getDb(), "synthetic-patient", changes()).map((query) => {
      if (!("toSQL" in query) || typeof query.toSQL !== "function")
        throw new Error("Expected SQL builder");
      return query.toSQL() as { sql: string; params: unknown[] };
    });
    expect(queries.map((query) => query.sql)).toEqual([
      expect.stringContaining('delete from "validations"'),
      expect.stringContaining('delete from "lens_cache"'),
      expect.stringContaining('insert into "facts"'),
      expect.stringContaining('update "finding_passages"'),
      expect.stringContaining('delete from "facts"'),
    ]);
    expect(queries.every((query) => query.params.includes("synthetic-patient"))).toBe(true);
    expect(
      queries.some((query) => /"reviews"|"letters"|"documents"|"segments"/.test(query.sql)),
    ).toBe(false);
  });

  it("defaults to preview and rejects incomplete CLI arguments", () => {
    expect(relabelArgs([])).toEqual({ patientId: "patient-0000-0001", apply: false });
    expect(relabelArgs(["--apply", "--patient", "synthetic"])).toEqual({
      patientId: "synthetic",
      apply: true,
    });
    for (const args of [["garbage"], ["--patient"], ["--patient", "--apply"]])
      expect(() => relabelArgs(args)).toThrow();
  });
});
