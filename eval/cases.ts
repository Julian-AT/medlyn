import type { TestCase } from "promptfoo";
import {
  answer,
  availability,
  citation,
  grounding,
  invariants,
  javascript,
  relevance,
} from "./assertions/rubrics.ts";
import { loadHeldout, loadRegression } from "./data.ts";

export async function regressionTests(): Promise<TestCase[]> {
  return (await loadRegression()).flatMap((situation) =>
    situation.questions.map((question) => ({
      description: `regression ${question.id}`,
      options: { disableVarExpansion: true },
      vars: {
        situationText: situation.text,
        questionId: question.id,
        question: question.question,
        expectedAnswer: question.answer,
        expectedSources: question.sources,
      },
      metadata: { suite: "regression", questionId: question.id, situationId: situation.id },
      assert: [
        javascript("answer", answer),
        javascript("citation", citation),
        javascript("availability", availability),
        javascript("invariants", invariants),
      ],
    })),
  );
}

export async function heldoutTests(): Promise<TestCase[]> {
  return (await loadHeldout()).map((situation) => ({
    description: `heldout ${situation.id}`,
    options: { disableVarExpansion: true },
    vars: {
      situationText: `${situation.title}\n${situation.description}`,
      criteria: situation.expectedKeyPoints,
    },
    metadata: { suite: "heldout", id: situation.id, tier: situation.tier },
    assert: [
      javascript("relevance", relevance),
      javascript("grounding", grounding),
      javascript("availability", availability),
      javascript("invariants", invariants),
    ],
  }));
}

// biome-ignore lint/style/noDefaultExport: Promptfoo loads its tests from the module default.
export default async function tests(): Promise<TestCase[]> {
  return [...(await regressionTests()), ...(await heldoutTests())];
}
