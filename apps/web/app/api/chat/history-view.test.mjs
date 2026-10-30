import { describe, expect, it } from "vitest";
import { historyBeforeQuestion, visibleChatMessages } from "./history-view.ts";

const turn = (id, role) => ({ id, role });
const history = [
  turn("q1", "user"),
  turn("a1", "assistant"),
  turn("a1-retry", "assistant"),
  turn("q2", "user"),
  turn("a2", "assistant"),
];

describe("regenerated chat history", () => {
  it("displays the latest answer version without losing user turns", () => {
    expect(visibleChatMessages(history).map((message) => message.id)).toEqual([
      "q1",
      "a1-retry",
      "q2",
      "a2",
    ]);
    expect(history).toHaveLength(5);
  });
  it("never replays the old answer when regenerating its question", () => {
    expect(historyBeforeQuestion(history, "q2").map((message) => message.id)).toEqual([
      "q1",
      "a1-retry",
    ]);
    expect(historyBeforeQuestion(history, "q1")).toEqual([]);
  });
  it("uses the latest saved versions as context for a new question", () => {
    expect(historyBeforeQuestion(history, "q3")).toEqual(visibleChatMessages(history));
  });
});
