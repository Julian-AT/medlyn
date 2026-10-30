import { describe, expect, it } from "vitest";
import { parseArgs } from "../ingest/multimodal/cli.ts";

const args = [
  "--pdf",
  "/private/tmp/test.pdf",
  "--patient",
  "pdf-demo",
  "--doc-id",
  "pdf-demo-d1",
  "--date",
  "2026-10-30",
  "--title",
  "Test",
];

describe("PDF CLI", () => {
  it("parses required metadata and dry-run mode", () => {
    const parsed = parseArgs([...args, "--dry-run"]);
    expect(parsed.metadata.patientId).toBe("pdf-demo");
    expect(parsed.metadata.id).toBe("pdf-demo-d1");
    expect(parsed.dryRun).toBe(true);
  });
  it("rejects incomplete, duplicate and unknown options", () => {
    expect(() => parseArgs(args.slice(0, -1))).toThrow();
    expect(() => parseArgs([...args, "--title", "Other"])).toThrow("duplicate");
    expect(() => parseArgs([...args, "--force"])).toThrow("Unknown");
    expect(() => parseArgs([])).toThrow("Missing");
  });
  it("protects the original challenge patient", () => {
    const original = [...args];
    original[3] = "patient-0000-0001";
    expect(() => parseArgs(original)).toThrow("separate patient");
  });
});
