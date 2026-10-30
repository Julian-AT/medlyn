import { describe, expect, it } from "vitest";
import { writeValidatedStream } from "../../../../apps/app/app/api/chat/validated-stream.ts";
import type { AgentEvidence } from "../tools.ts";

type Stream = Parameters<typeof writeValidatedStream>[0];
type Writer = Parameters<typeof writeValidatedStream>[1];
type Chunk = Parameters<Writer["write"]>[0];

async function run(
  parts: Record<string, unknown>[] | AsyncIterable<Record<string, unknown>>,
  signal?: AbortSignal,
  knownClaimIds: string[] = [],
) {
  const chunks: Chunk[] = [];
  const writer: Writer = {
    write: (part) => {
      chunks.push(part);
    },
    merge: () => {
      throw new Error("Unexpected stream merge");
    },
    onError: undefined,
  };
  const evidence: AgentEvidence = {
    facts: new Map(),
    segments: new Map(),
    absences: [],
    calculations: [],
  };
  async function* stream() {
    yield* parts;
  }
  await writeValidatedStream(
    stream() as Stream,
    writer,
    evidence,
    {
      asOf: "2026-01-01",
      corpusRevision: "synthetic-rev",
      eligibleDocumentIds: [],
    },
    knownClaimIds,
    "synthetic-patient",
    signal,
  );
  return chunks;
}

describe("validated chat stream", () => {
  it("never forwards unsupported model text or reasoning across steps", async () => {
    const chunks = await run([
      { type: "start-step" },
      { type: "text-delta", text: "Invented patient claim [unknown-fact]." },
      { type: "reasoning-delta", text: "Unvalidated internal guess." },
      { type: "finish-step" },
      { type: "start-step" },
      { type: "text-delta", text: "Another unsupported claim." },
      { type: "finish-step" },
    ]);
    const rendered = JSON.stringify(chunks);
    expect(rendered).not.toContain("Invented patient claim");
    expect(rendered).not.toContain("Another unsupported");
    expect(rendered).not.toContain("Unvalidated internal");
    expect(rendered).toContain("Couldn't produce a supported answer");
    expect(chunks.filter((chunk) => chunk.type === "finish-step")).toHaveLength(2);
  });

  it("streams visual tool results and masks tool errors", async () => {
    const chunks = await run([
      {
        type: "tool-call",
        toolCallId: "trend",
        toolName: "show_lab_trend",
        input: { measure: "weight" },
      },
      {
        type: "tool-result",
        toolCallId: "trend",
        toolName: "show_lab_trend",
        output: { points: [] },
      },
      {
        type: "tool-call",
        toolCallId: "failure",
        toolName: "check_documented",
        input: { concept: "synthetic" },
      },
      { type: "tool-error", toolCallId: "failure", error: new Error("private backend error") },
    ]);
    expect(chunks).toContainEqual({
      type: "tool-output-available",
      toolCallId: "trend",
      output: { points: [] },
    });
    expect(chunks).toContainEqual({
      type: "tool-output-error",
      toolCallId: "failure",
      errorText: "Couldn't complete this check",
    });
    expect(JSON.stringify(chunks)).not.toContain("private backend error");
  });

  it("drops source and letter client calls with unknown evidence ids", async () => {
    const chunks = await run([
      {
        type: "tool-call",
        toolCallId: "bad-source",
        toolName: "show_source",
        input: { segmentId: "unknown-segment" },
      },
      {
        type: "tool-call",
        toolCallId: "bad-letter",
        toolName: "add_to_letter",
        input: { claimIds: ["unknown-claim"] },
      },
    ]);
    expect(chunks.some((chunk) => chunk.type === "tool-input-available")).toBe(false);
  });
  it("finishes a visual answer without validating an untrusted recap", async () => {
    const chunks = await run([
      { type: "tool-call", toolCallId: "lens", toolName: "open_lens", input: {} },
      { type: "tool-result", toolCallId: "lens", toolName: "open_lens", output: { sections: [] } },
      { type: "text-delta", text: "Untrusted clinical recap [invented]." },
      { type: "finish-step" },
    ]);
    expect(chunks).toContainEqual({ type: "data-response-status", data: { status: "view" } });
    expect(JSON.stringify(chunks)).not.toContain("Untrusted clinical recap");
    expect(chunks.some((chunk) => chunk.type === "text-delta")).toBe(false);
  });

  it("settles unfinished tools and emits a safe fallback at end of stream", async () => {
    const chunks = await run([
      { type: "tool-call", toolCallId: "unfinished", toolName: "open_lens", input: {} },
    ]);
    expect(chunks).toContainEqual({
      type: "tool-output-error",
      toolCallId: "unfinished",
      errorText: "Couldn't complete this check. Try again.",
    });
    expect(JSON.stringify(chunks)).toContain("Couldn't produce a supported answer");
  });

  it("settles an already aborted stream without leaking the abort reason", async () => {
    const controller = new AbortController();
    controller.abort(new Error("private provider error"));
    const chunks = await run([], controller.signal);
    expect(JSON.stringify(chunks)).toContain("Couldn't produce a supported answer");
    expect(JSON.stringify(chunks)).not.toContain("private provider error");
  });

  it("ends a stalled tool even when its iterator ignores cancellation", async () => {
    const controller = new AbortController();
    async function* stalled() {
      yield { type: "tool-call", toolCallId: "stalled", toolName: "open_lens", input: {} };
      controller.abort(new Error("deadline"));
      await new Promise<never>(() => undefined);
    }
    const chunks = await run(stalled(), controller.signal);
    expect(chunks).toContainEqual({
      type: "tool-output-error",
      toolCallId: "stalled",
      errorText: "Couldn't complete this check. Try again.",
    });
    expect(JSON.stringify(chunks)).toContain("Couldn't produce a supported answer");
  });

  it("preserves valid client actions that do not return a server result", async () => {
    const chunks = await run(
      [
        {
          type: "tool-call",
          toolCallId: "letter",
          toolName: "add_to_letter",
          input: { claimIds: ["synthetic-claim"] },
        },
      ],
      undefined,
      ["synthetic-claim"],
    );
    expect(chunks.some((chunk) => chunk.type === "tool-input-available")).toBe(true);
    expect(chunks.some((chunk) => chunk.type === "tool-output-error")).toBe(false);
    expect(JSON.stringify(chunks)).not.toContain("Couldn't produce a supported answer");
  });
});
