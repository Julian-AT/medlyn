import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";

const repoRoot = path.resolve(import.meta.dirname, "..");
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
const secretNames = new Set([
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "FISH_AUDIO_API_KEY",
  "FISH_AUDIO_VOICE_ID",
]);

export function projectEnvironment(project, source) {
  const publicEnv = {
    NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL || "https://medlyn.health",
    NEXT_PUBLIC_APP_URL: source.NEXT_PUBLIC_APP_URL || "https://app.medlyn.health",
  };
  if (project === "www") return publicEnv;
  if (project !== "app") throw new Error("Project must be app or www");
  const gemini = source.LLM_PROVIDER_PROD === "gemini";
  const geminiKey = source.GEMINI_API_KEY_PROD || source.GEMINI_API_KEY || "";
  const fallbacks = Object.fromEntries(
    ["MODEL_FAST_FALLBACK", "MODEL_REASONING_FALLBACK"]
      .map((name) => [name, source[`${name}_PROD`] || source[name]])
      .filter(([, value]) => value),
  );
  return {
    ...publicEnv,
    DATABASE_URL: source.DATABASE_URL_DEMO || source.DATABASE_URL || "",
    // Gemini mode overwrites a stale OpenAI key, which the client would otherwise prefer.
    OPENAI_BASE_URL: gemini ? GEMINI_BASE_URL : OPENAI_BASE_URL,
    OPENAI_API_KEY: gemini ? geminiKey : source.OPENAI_API_KEY_PROD || "",
    MODEL_FAST: source.MODEL_FAST_PROD || source.MODEL_FAST || "",
    MODEL_REASONING: source.MODEL_REASONING_PROD || source.MODEL_REASONING || "",
    ...fallbacks,
    MEDLYN_MOCK: "0",
    MEDLYN_VERIFIER: "gpt",
    MEDLYN_LLM_CONCURRENCY: source.MEDLYN_LLM_CONCURRENCY || "8",
    GEMINI_EMBED_REQUESTS_PER_MINUTE: source.GEMINI_EMBED_REQUESTS_PER_MINUTE || "80",
    ...Object.fromEntries(
      ["GEMINI_API_KEY", "FISH_AUDIO_API_KEY", "FISH_AUDIO_VOICE_ID"]
        .filter((name) => source[name])
        .map((name) => [name, source[name]]),
    ),
    ...(gemini ? { GEMINI_API_KEY: geminiKey } : {}),
  };
}

export function environmentProblems(_project, environment) {
  const problems = Object.entries(environment)
    .filter(([, value]) => !value)
    .map(([name]) => `${name} is missing`);
  for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "DATABASE_URL"]) {
    if (!environment[name]) continue;
    try {
      const url = new URL(environment[name]);
      const allowed = name === "DATABASE_URL" ? ["postgres:", "postgresql:"] : ["https:"];
      if (!allowed.includes(url.protocol) || /^(localhost|127\.|\[::1\])/.test(url.hostname)) {
        problems.push(`${name} must use a production URL`);
      }
    } catch {
      problems.push(`${name} is not a valid URL`);
    }
  }
  if (Boolean(environment.FISH_AUDIO_API_KEY) !== Boolean(environment.FISH_AUDIO_VOICE_ID)) {
    problems.push("Set both FISH_AUDIO_API_KEY and FISH_AUDIO_VOICE_ID, or neither");
  }
  return problems;
}

export function maskedEnvironment(environment) {
  return Object.entries(environment).map(([name, value]) => {
    const display = !value ? "[missing]" : secretNames.has(name) ? "[masked]" : value;
    return `${name}=${display}`;
  });
}

function main() {
  const { values } = parseArgs({
    options: {
      project: { type: "string", default: "all" },
      "app-dir": { type: "string" },
      apply: { type: "boolean", default: false },
    },
  });
  if (!["app", "www", "all"].includes(values.project)) {
    throw new Error("Use --project app, www or all");
  }
  const envPath = path.join(repoRoot, ".env");
  const source = {
    ...(existsSync(envPath) ? parseEnv(readFileSync(envPath, "utf8")) : {}),
    ...process.env,
  };
  const appDirectory = values["app-dir"] || "apps/app";
  const projects = values.project === "all" ? ["www", "app"] : [values.project];
  const plans = projects.map((project) => {
    const directory = path.resolve(repoRoot, project === "www" ? "apps/www" : appDirectory);
    if (!directory.startsWith(`${repoRoot}${path.sep}`) || !existsSync(directory)) {
      throw new Error("Project directory must exist inside the repository");
    }
    const environment = projectEnvironment(project, source);
    console.log(`\n${project} (${path.relative(repoRoot, directory)}) — production`);
    for (const line of maskedEnvironment(environment)) console.log(line);
    const problems = environmentProblems(project, environment);
    for (const problem of problems) console.log(`Required: ${problem}`);
    return { directory, environment, problems };
  });
  if (!values.apply) return;
  if (plans.some((plan) => plan.problems.length)) {
    throw new Error("Fix the missing or invalid production settings before --apply");
  }
  if (plans.some((plan) => !existsSync(path.join(plan.directory, ".vercel/project.json")))) {
    throw new Error("Run vercel link for each selected app before --apply");
  }
  for (const { directory, environment } of plans) {
    for (const [name, value] of Object.entries(environment)) {
      const result = spawnSync(
        "vercel",
        ["env", "add", name, "production", "--force", "--cwd", directory],
        { input: value, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
      );
      if (result.error || result.status !== 0) {
        throw new Error(`Vercel could not set ${name}; check CLI login and project access`);
      }
      console.log(`Applied ${name}`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Environment setup failed");
    process.exitCode = 1;
  }
}
