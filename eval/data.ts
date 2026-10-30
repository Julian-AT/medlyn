import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const evalRoot = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(evalRoot, "..");
export const outputRoot = path.join(evalRoot, "output");

export type ExpectedAnswer = {
  id: string;
  situation: string;
  question: string;
  answer: string;
  sources: string[];
};
export type RegressionSituation = {
  id: string;
  title: string;
  description: string;
  text: string;
  questions: ExpectedAnswer[];
};
export type HeldoutSituation = {
  id: string;
  tier: 1 | 2 | 3;
  title: string;
  description: string;
  expectedKeyPoints: string[];
  sourceDocumentIds: string[];
};

export function dataRoot(): string {
  if (!process.env.MEDLYN_DATA_PATH) throw new Error("MEDLYN_DATA_PATH is required for evaluation");
  return path.resolve(repoRoot, process.env.MEDLYN_DATA_PATH);
}

async function casesRoot(): Promise<string> {
  let candidate = dataRoot();
  while (candidate !== path.dirname(candidate)) {
    const cases = path.join(candidate, "cases");
    try {
      await access(path.join(cases, "expected.json"));
      return cases;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    candidate = path.dirname(candidate);
  }
  throw new Error("Cannot locate cases/expected.json above MEDLYN_DATA_PATH");
}

export function parseSituations(
  markdown: string,
  expected: ExpectedAnswer[],
): RegressionSituation[] {
  const situations = [
    ...markdown.matchAll(/^## (\d+)\. (.+)\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm),
  ].map((match) => {
    const description = match[3].split(/^\s*1\. /m)[0].trim();
    const title = match[2].trim();
    return {
      id: match[1],
      title,
      description,
      text: `${title}\n${description}`,
      questions: expected.filter((q) => q.id.split(".")[0] === match[1]),
    };
  });
  if (
    situations.length !== 5 ||
    expected.length !== 15 ||
    situations.some((s) => s.questions.length !== 3)
  ) {
    throw new Error("Regression corpus must contain five situations with three questions each");
  }
  return situations;
}

export async function loadRegression(): Promise<RegressionSituation[]> {
  const root = await casesRoot();
  const [markdown, json] = await Promise.all([
    readFile(path.join(root, "situations.md"), "utf8"),
    readFile(path.join(root, "expected.json"), "utf8"),
  ]);
  return parseSituations(markdown, JSON.parse(json));
}

export async function loadHeldout(): Promise<HeldoutSituation[]> {
  const rows: HeldoutSituation[] = JSON.parse(
    await readFile(path.join(evalRoot, "heldout/situations.json"), "utf8"),
  );
  if (
    rows.length !== 20 ||
    new Set(rows.map((r) => r.id)).size !== 20 ||
    rows.some(
      (r) =>
        ![1, 2, 3].includes(r.tier) ||
        r.expectedKeyPoints.length < 2 ||
        r.expectedKeyPoints.length > 3,
    )
  ) {
    throw new Error("Held-out corpus must contain 20 unique situations with 2–3 criteria each");
  }
  return rows;
}
