import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, parseEnv } from "node:util";

const repoRoot = path.resolve(import.meta.dirname, "..");
const secretNames = new Set([
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "DEMO_PASSWORD",
  "DEMO_SESSION_SECRET",
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
  return {
    ...publicEnv,
    DATABASE_URL: source.DATABASE_URL_DEMO || source.DATABASE_URL || "",
    OPENAI_BASE_URL: "https://api.openai.com/v1",
    OPENAI_API_KEY: source.OPENAI_API_KEY_PROD || "",
    MODEL_FAST: source.MODEL_FAST_PROD || source.MODEL_FAST || "",
    MODEL_REASONING: source.MODEL_REASONING_PROD || source.MODEL_REASONING || "",
    DEMO_PASSWORD: source.DEMO_PASSWORD || "",
    DEMO_SESSION_SECRET: source.DEMO_SESSION_SECRET || "",
    MEDLYN_MOCK: "0",
    MEDLYN_VERIFIER: "gpt",
    MEDLYN_LLM_CONCURRENCY: source.MEDLYN_LLM_CONCURRENCY || "8",
    GEMINI_EMBED_REQUESTS_PER_MINUTE: source.GEMINI_EMBED_REQUESTS_PER_MINUTE || "80",
    ...Object.fromEntries(
      ["GEMINI_API_KEY", "FISH_AUDIO_API_KEY", "FISH_AUDIO_VOICE_ID"]
        .filter((name) => source[name])
        .map((name) => [name, source[name]]),
    ),
  };
}

export function environmentProblems(project, environment) {
  const problems = Object.entries(environment)
    .filter(([, value]) => !value)
    .map(([name]) => `${name} is missing`);
  if (project === "app" && environment.DEMO_SESSION_SECRET.length < 32) {
    problems.push("DEMO_SESSION_SECRET must contain at least 32 characters");
  }
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
  const appDirectory =
    values["app-dir"] || (existsSync(path.join(repoRoot, "apps/app")) ? "apps/app" : "apps/web");
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
