import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChatMessage } from "./chat-message";

const queue = { state: null, start: async () => {}, stop: () => {} };
const window = {
  asOf: "2020-02-01",
  corpusRevision: "synthetic-revision",
  eligibleDocumentIds: ["synthetic-document"],
};
const context = { type: "data-evidence-context", data: { window } };
const tool = {
  type: "tool-search_facts",
  toolCallId: "synthetic-search",
  state: "output-available",
  input: {},
  output: { facts: [] },
};
function render(parts, busy = false) {
  return renderToStaticMarkup(
    createElement(ChatMessage, {
      message: { id: "synthetic-message", role: "assistant", parts },
      queue,
      busy,
      onSpeak: () => {},
      onStopSpeech: () => {},
    }),
  );
}

describe("assistant message rendering", () => {
  it("shows a plain markdown answer without validation data", () => {
    const html = render([{ type: "text", text: "Hello! **Choose a topic**." }]);
    expect(html).toContain("Hello!");
    expect(html).toContain('data-streamdown="strong">Choose a topic</span>');
    expect(html).not.toContain("Evidence scope");
  });

  it("shows partial text during streaming and withholds the evidence footer", () => {
    const html = render([context, tool, { type: "text", text: "The answer is arriving" }], true);
    expect(html).toContain("The answer is arriving");
    expect(html).not.toContain("Evidence scope");
    expect(html).not.toContain("Checking answer against sources");
  });

  it("puts evidence scope after the finished answer", () => {
    const html = render([context, tool, { type: "text", text: "Synthetic answer." }]);
    expect(html.indexOf("Evidence scope")).toBeGreaterThan(html.indexOf("Synthetic answer."));
    expect(html).toContain("1 document");
  });

  it("hides evidence scope on a finished tool-free answer with a context window", () => {
    expect(
      render([context, { type: "text", text: "I can help you explore sources." }]),
    ).not.toContain("Evidence scope");
  });

  it("renders an end-of-stream error as a retry notice", () => {
    const html = render([{ type: "data-response-status", data: { status: "error" } }]);
    expect(html).toContain("Try again.");
    expect(html).not.toContain("Checking");
  });
});
