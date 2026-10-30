import { describe, expect, it } from "vitest";
import { evidenceScope } from "./evidence-scope.ts";

const window = {
  asOf: "2020-02-01",
  corpusRevision: "synthetic-revision",
  eligibleDocumentIds: ["a", "b"],
};
const tool = (name, output, state = "output-available") => ({
  type: `tool-${name}`,
  toolCallId: name,
  state,
  input: {},
  output,
});
const message = (...parts) => ({
  id: "scope",
  role: "assistant",
  parts: [{ type: "data-evidence-context", data: { window } }, ...parts],
});

describe("chat evidence scope", () => {
  it("uses the server window and deduplicates returned facts and documents", () => {
    const result = evidenceScope(
      message(
        tool("search_facts", {
          facts: [
            { id: "fact-a", documentId: "a" },
            { id: "fact-a", documentId: "a" },
            { id: "fact-b", documentId: "b" },
          ],
        }),
      ),
    );
    expect(result).toEqual({
      asOf: window.asOf,
      eligible: 2,
      retrievedDocuments: 2,
      retrievedFacts: 2,
      searched: null,
    });
  });
  it("does not confuse all returned documents with exhaustive search", () => {
    expect(
      evidenceScope(message(tool("show_patient_summary", { documentCount: 2 }))).searched,
    ).toBeNull();
  });
  it("admits full-document coverage only after a successful matching check", () => {
    const searched = { eligible: 2, total: 2, asOf: window.asOf };
    for (const status of ["documented", "not_documented"])
      expect(evidenceScope(message(tool("check_documented", { status, searched }))).searched).toBe(
        2,
      );
    for (const output of [
      { status: "unavailable", searched },
      { status: "not_documented", searched: { ...searched, asOf: "2019-01-01" } },
      { status: "not_documented", searched: { ...searched, eligible: 1 } },
    ])
      expect(evidenceScope(message(tool("check_documented", output))).searched).toBeNull();
  });
  it("ignores unfinished and failed tool outputs", () => {
    for (const state of ["input-streaming", "input-available", "output-error", "output-denied"])
      expect(
        evidenceScope(message(tool("search_facts", { facts: [{ id: "a" }] }, state)))
          .retrievedFacts,
      ).toBe(0);
  });
  it("counts evidence in nested display objects without counting claim ids", () => {
    expect(
      evidenceScope(
        message(
          tool("show_medications", {
            lists: [
              {
                documentId: "a",
                lines: [{ factId: "f1", line: { id: "c1", factIds: ["f1", "f2"] } }],
              },
            ],
          }),
        ),
      ).retrievedFacts,
    ).toBe(2);
  });
  it("does not invent a window for old history or user messages", () => {
    expect(evidenceScope({ id: "old", role: "assistant", parts: [] })).toBeNull();
    expect(evidenceScope({ ...message(), role: "user" })).toBeNull();
  });
});
