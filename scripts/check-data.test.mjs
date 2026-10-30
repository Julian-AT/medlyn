import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const directory = mkdtempSync(path.join(os.tmpdir(), "medlyn-data-scan-"));
const documents = path.join(directory, "documents");
mkdirSync(documents);
const text = "Synthetic scanner fixture only. ".repeat(12);
writeFileSync(path.join(documents, "fixture.json"), JSON.stringify({ text }));
after(() => rmSync(directory, { recursive: true, force: true }));

function scan(file) {
  return spawnSync(process.execPath, ["scripts/check-data.mjs", "--files", file], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, MEDLYN_DATA_PATH: directory },
  });
}

test("scans untracked working files for copied 120-character passages", () => {
  const file = path.join(directory, "copied.txt");
  writeFileSync(file, text.slice(0, 120));
  const result = scan(file);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /120-char verbatim passage/);
});

test("preserves the 120-character threshold", () => {
  const file = path.join(directory, "short.txt");
  writeFileSync(file, text.slice(0, 119));
  assert.equal(scan(file).status, 0);
});

test("rejects blocked paths even when the file is absent", () => {
  const result = scan("data/nonexistent.json");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /blocked path/);
});
