import { describe, expect, it } from "vitest";
import { messageEvidence, UNSUPPORTED_ANSWER } from "./message-evidence.ts";

const claim = (id, support = "supported") => ({
  id,
  kind: "composed",
  text: `Synthetic checked statement ${id}.`,
  factIds: ["fact-example"],
  segmentIds: ["synthetic-s0"],
  author: "machine",
  validation: { key: `validation-${id}`, support },
});
const message = (parts) => ({ id: "answer-example", role: "assistant", parts });
const validated = (claims, speech = null) => ({ type: "data-validated", data: { claims, speech } });

describe("chat claim boundary", () => {
  it("renders partial streaming text and all subsequent text parts", () => {
    const partial = messageEvidence(message([{ type: "text", text: "Hello", state: "streaming" }]));
    expect(partial.text).toBe("Hello");
    const result = messageEvidence(
      message([
        { type: "text", text: "Hello!", state: "done" },
        { type: "text", text: "How can I help?", state: "streaming" },
      ]),
    );
    expect(result.text).toBe("Hello!\n\nHow can I help?");
    expect(result.copyText).toBe(result.text);
    expect(result.checked).toBe(false);
  });
  it("retains citations without replacing or duplicating streamed text", () => {
    const a = claim("a");
    const result = messageEvidence(
      message([
        validated([a]),
        { type: "text", text: a.text },
        { type: "text", text: "Choose a follow-up." },
      ]),
    );
    expect(result.text).toBe(`${a.text}\n\nChoose a follow-up.`);
    expect(result.claims).toEqual([a]);
    expect(result.sources).toEqual(a.segmentIds);
  });
  it("shows retry copy when a finished stream reports a real error", () => {
    expect(
      messageEvidence(
        message([
          { type: "data-response-status", data: { status: "view" } },
          { type: "data-response-status", data: { status: "error" } },
        ]),
      ).notice,
    ).toBe("Couldn't complete this response. Try again.");
  });

  it("uses fixed view status copy without accepting server prose as a claim", () => {
    const evidence = messageEvidence(
      message([
        { type: "data-response-status", data: { status: "view", text: "Untrusted claim" } },
      ]),
    );
    expect(evidence.notice).toBe("Showing the source-linked view.");
    expect(evidence.text).toBe("");
    expect(evidence.speech).toEqual([]);
    expect(
      messageEvidence(message([{ type: "data-response-status", data: { status: "other" } }]))
        .notice,
    ).toBeNull();
  });
  it("renders server-admitted plain text without a patient validation payload", () => {
    const evidence = messageEvidence(message([{ type: "text", text: "Unvalidated statement." }]));
    expect(evidence.text).toBe("Unvalidated statement.");
    expect(evidence.copyText).toBe("Unvalidated statement.");
    expect(evidence.sources).toEqual([]);
    expect(evidence.speech).toEqual([]);
  });
  it("renders only admitted claims and deduplicates streamed payloads", () => {
    const a = claim("a");
    const evidence = messageEvidence(
      message([validated([a]), validated([a, claim("b", "unsupported"), claim("c", "partial")])]),
    );
    expect(evidence.claims).toEqual([a]);
    expect(evidence.text).toBe(a.text);
    expect(evidence.sources).toEqual(["synthetic-s0"]);
  });
  it("never promotes clinician annotations into the answer", () => {
    expect(
      messageEvidence(message([validated([{ ...claim("note"), kind: "annotation" }])])).claims,
    ).toEqual([]);
  });
  it("uses only server-signed speech matching the checked claims", () => {
    const a = claim("a");
    const speech = { text: a.text, receipt: "server-signed-example" };
    expect(messageEvidence(message([validated([a], speech)])).speech).toEqual([speech]);
    expect(
      messageEvidence(message([validated([a], { ...speech, text: "Different statement." })]))
        .speech,
    ).toEqual([]);
    expect(
      messageEvidence(message([validated([claim("a", "unsupported")], speech)])).speech,
    ).toEqual([]);
  });
  it("accepts the fixed unavailable message without displaying arbitrary text", () => {
    expect(messageEvidence(message([{ type: "text", text: UNSUPPORTED_ANSWER }])).unavailable).toBe(
      true,
    );
    expect(messageEvidence(message([{ type: "text", text: "Another fallback" }])).unavailable).toBe(
      false,
    );
  });
  it("copies checked visual tool lines without repeating them as answer prose", () => {
    const checked = claim("medication");
    const evidence = messageEvidence(
      message([
        {
          type: "tool-show_medications",
          toolCallId: "medication-view",
          state: "output-available",
          input: {},
          output: {
            lists: [{ lines: [{ line: checked }, { line: claim("rejected", "unsupported") }] }],
          },
        },
      ]),
    );
    expect(evidence.text).toBe("");
    expect(evidence.copyText).toBe(checked.text);
    expect(evidence.sources).toEqual(["synthetic-s0"]);
    expect(evidence.factIds).toEqual(["fact-example"]);
  });
  it("never copies arbitrary raw search prose or unfinished UI outputs", () => {
    for (const [type, state] of [
      ["tool-search_facts", "output-available"],
      ["tool-show_medications", "input-available"],
    ]) {
      expect(
        messageEvidence(
          message([
            {
              type,
              state,
              toolCallId: "raw-tool",
              input: {},
              output: { text: "Raw text", line: claim("hidden") },
            },
          ]),
        ).copyText,
      ).toBe("");
    }
  });
});
