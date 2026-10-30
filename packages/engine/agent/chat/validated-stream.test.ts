import { describe, expect, it } from "vitest";
import { writeValidatedStream } from "../../../../apps/web/app/api/chat/validated-stream.ts";
import { evidenceWindow } from "../../store.ts";
import type { AgentEvidence } from "../tools.ts";

type Stream = Parameters<typeof writeValidatedStream>[0];
type Writer = Parameters<typeof writeValidatedStream>[1];
type Chunk = Parameters<Writer["write"]>[0];

async function run(parts: Record<string, unknown>[]) {
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
  await writeValidatedStream(stream() as Stream, writer, evidence, await evidenceWindow(), []);
  return chunks;
}

describe.skipIf(!process.env.DATABASE_URL)("validated chat stream", () => {
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
});
