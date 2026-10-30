#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const WINDOW = 120;
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|mp4|webm|mov|woff2?|ttf|otf|pdf|lottie|zip|gz)$/i;
const BLOCKED_PATHS = [
  /^data\//,
  /(^|\/)TRACK-1-/,
  /\.zip$/,
  /\.dump$/,
  /\.sql$/,
  /^\.env($|\.(?!example$))/,
];

const repoRoot = resolve(import.meta.dirname, "..");
const dataPath = resolve(
  repoRoot,
  process.env.MEDLYN_DATA_PATH ?? "./TRACK-1-clinical-documentation/data/patient-0000-0001",
);
const args = process.argv.slice(2);
const workingFiles = args[0] === "--all" || args[0] === "--files";
if (args.length && !workingFiles) throw new Error("Use --all or --files <paths...>");

const staged =
  args[0] === "--files"
    ? args.slice(1)
    : execFileSync(
        "git",
        args[0] === "--all"
          ? ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]
          : ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"],
        {
          encoding: "utf8",
        },
      )
        .split("\0")
        .filter(Boolean);

const normalise = (s) =>
  s
    .replace(/<BR>/gi, "\n")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

function documentWindows() {
  const dir = join(dataPath, "documents");
  if (!existsSync(dir)) return null;
  const windows = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const text = normalise(JSON.parse(readFileSync(join(dir, file), "utf8")).text ?? "");
    for (let i = 0; i + WINDOW <= text.length; i += WINDOW / 2)
      windows.add(text.slice(i, i + WINDOW));
  }
  return windows;
}

const failures = staged
  .filter((path) => BLOCKED_PATHS.some((re) => re.test(path)))
  .map((path) => `${path}: blocked path`);

const windows = documentWindows();
if (windows) {
  for (const path of staged) {
    if (!existsSync(path) || BINARY.test(path)) continue;
    const content = normalise(
      workingFiles
        ? readFileSync(path, "utf8")
        : execFileSync("git", ["show", `:${path}`], {
            encoding: "utf8",
            maxBuffer: 64 * 1024 * 1024,
          }),
    );
    for (const w of windows) {
      if (content.includes(w)) {
        failures.push(
          `${path}: contains a ${WINDOW}-char verbatim passage from the challenge documents`,
        );
        break;
      }
    }
  }
} else {
  console.warn(`check-data: no documents at ${dataPath}; only path rules were checked`);
}

if (failures.length) {
  console.error(`check-data: refusing to commit challenge data\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(
  `check-data: checked ${staged.length} paths${windows ? " and 120-character passages" : ""}`,
);
