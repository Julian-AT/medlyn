#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requested = process.argv.slice(2);
const inventory = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  {
    cwd: root,
    encoding: "utf8",
  },
)
  .split("\0")
  .filter(Boolean);
const files = requested.length ? requested : inventory.filter((path) => path.endsWith(".md"));
const known = new Set(inventory.map((path) => resolve(root, path)));
for (const path of [...known]) {
  let parent = dirname(path);
  while (parent.startsWith(`${root}/`)) {
    known.add(parent);
    parent = dirname(parent);
  }
}
const broken = [];
let checked = 0;
for (const file of new Set(files)) {
  const source = resolve(root, file);
  if (!existsSync(source)) continue;
  const text = readFileSync(source, "utf8").replace(/^(`{3,}|~{3,}).*\n[\s\S]*?^\1.*$/gm, "");
  const targets = [
    ...text.matchAll(/\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*["'])?\s*\)/g),
    ...text.matchAll(/(?:href|src)=["']([^"']+)["']/g),
    ...text.matchAll(/^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm),
  ];
  for (const match of targets) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(target)) continue;
    const path = decodeURIComponent(target.split(/[?#]/, 1)[0]);
    if (!path) continue;
    checked++;
    if (!known.has(resolve(dirname(source), path))) broken.push(`${file}: ${target}`);
  }
}
if (broken.length) {
  console.error(broken.join("\n"));
  console.error(`check-links: ${broken.length} broken of ${checked} relative links`);
  process.exitCode = 1;
} else {
  console.log(`check-links: ${checked} relative links resolve across ${new Set(files).size} files`);
}
