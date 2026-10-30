import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { Fact } from "../../contracts.ts";
import type { CorpusDocument } from "../corpus.ts";
import { VALIDATOR_VERSION } from "../extract.ts";
import { sha256 } from "../hash.ts";

const DIRECTORY = "/private/tmp/medlyn-multimodal-stages";

export function stageKey(
  stage: string,
  documents: CorpusDocument[],
  facts: Fact[],
  parameters?: unknown,
): string {
  return sha256(
    JSON.stringify({
      version: "multimodal-stages-v1",
      validator: VALIDATOR_VERSION,
      stage,
      models: [process.env.MODEL_FAST, process.env.MODEL_REASONING],
      documents,
      facts,
      parameters,
    }),
  );
}

export async function retryStage<T>(stage: string, run: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (
        attempt >= 3 ||
        !(error instanceof Error) ||
        !/LLM (?:408|429|500|502|503|504)\b|fetch failed|timeout|aborted/i.test(error.message)
      ) {
        throw error;
      }
      const delayMs = 15_000 * (attempt + 1);
      console.info(JSON.stringify({ type: "multimodal_backoff", stage, delayMs }));
      await delay(delayMs);
    }
  }
}

/** Runtime-only checkpoints retain successful stages when the shared proxy is rate limited. */
export async function stageFacts(
  stage: string,
  documents: CorpusDocument[],
  input: Fact[],
  run: () => Promise<Fact[]>,
  parameters?: unknown,
): Promise<Fact[]> {
  await mkdir(DIRECTORY, { recursive: true, mode: 0o700 });
  await chmod(DIRECTORY, 0o700);
  const key = stageKey(stage, documents, input, parameters);
  const filename = `${DIRECTORY}/${key}.json`;
  try {
    const facts = Fact.array().parse(JSON.parse(await readFile(filename, "utf8")));
    console.info(
      JSON.stringify({
        type: "multimodal_stage",
        stage,
        facts: facts.length,
        cached: true,
      }),
    );
    return facts;
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
  const facts = Fact.array().parse(await retryStage(stage, run));
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(facts), { mode: 0o600 });
  await rename(temporary, filename);
  console.info(
    JSON.stringify({
      type: "multimodal_stage",
      stage,
      facts: facts.length,
      cached: false,
    }),
  );
  return facts;
}
