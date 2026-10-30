import { pathToFileURL } from "node:url";
import { CHIPS } from "./needs/profiles.ts";
import { streamLens } from "./stream.ts";

export function parseArgs(args: string[]) {
  let chipId: string | undefined;
  let asOf: string | undefined;
  let noCache = false;
  const text: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--") continue;
    if (arg === "--no-cache") {
      noCache = true;
      continue;
    }
    if (arg === "--chip" || arg === "--as-of") {
      const value = args[++index];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
      if (arg === "--chip") chipId = value;
      else asOf = value;
      continue;
    }
    if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    text.push(arg);
  }
  const chip = CHIPS.find((entry) => entry.id === chipId);
  if (chipId && !chip)
    throw new Error(`Unknown chip ${chipId}; choose ${CHIPS.map((entry) => entry.id).join(", ")}`);
  const input = text.join(" ").trim() || chip?.text;
  if (!input)
    throw new Error("Usage: pnpm lens <situation> [--chip id] [--no-cache] [--as-of YYYY-MM-DD]");
  return { text: input, chipId, noCache, ...(asOf ? { asOf } : {}) };
}

async function main() {
  const req = parseArgs(process.argv.slice(2));
  for await (const event of streamLens(req)) {
    process.stdout.write(`${JSON.stringify(event)}\n`);
    if (event.type === "error") process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Lens failed");
    process.exitCode = 1;
  });
}
