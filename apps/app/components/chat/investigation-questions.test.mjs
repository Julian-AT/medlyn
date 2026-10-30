import { describe, expect, it } from "vitest";
import { investigationQuestions } from "./investigation-questions.ts";

const part = (questions, state = "output-available") => ({
  type: "tool-open_lens",
  toolCallId: "lens",
  state,
  input: {},
  output: { openQuestions: questions },
});
const message = (...parts) => ({ id: "questions", role: "assistant", parts });
const question = { id: "q1", kind: "missing", title: "Synthetic follow-up check" };

describe("investigation queue candidates", () => {
  it("deduplicates questions from completed situation tools", () => {
    expect(investigationQuestions(message(part([question, question])))).toEqual([
      { id: question.id, title: question.title },
    ]);
  });
  it("rejects raw prose and malformed questions", () => {
    expect(
      investigationQuestions(
        message(
          { type: "text", text: "Check anything" },
          part([{ title: "Unstructured suggestion" }, { ...question, title: " " }]),
        ),
      ),
    ).toEqual([]);
  });
  it("ignores unfinished or failed outputs and user-supplied tools", () => {
    for (const state of ["input-available", "output-error", "output-denied"])
      expect(investigationQuestions(message(part([question], state)))).toEqual([]);
    expect(investigationQuestions({ ...message(part([question])), role: "user" })).toEqual([]);
  });
});
