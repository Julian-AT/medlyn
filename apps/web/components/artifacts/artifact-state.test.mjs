import { describe, expect, it } from "vitest";
import { parseArtifact } from "./artifact-state.ts";

describe("artifact URL state", () => {
  it.each(["passage", "document", "findings", "lens", "letter", "chart"])(
    "restores a %s artifact",
    (kind) => {
      expect(parseArtifact(`${kind}:call_test-1`)).toEqual({ kind, id: "call_test-1" });
    },
  );
  it.each([
    null,
    "",
    "passage",
    "passage:",
    "other:test",
    "passage:../../secret",
    "passage:test:extra",
  ])("rejects malformed state %s", (value) => {
    expect(parseArtifact(value)).toBeNull();
  });
  it("restores the selected document segment without accepting malformed identifiers", () => {
    expect(parseArtifact("document:test", "test-s2")).toEqual({
      kind: "document",
      id: "test",
      segmentId: "test-s2",
    });
    expect(parseArtifact("document:test", "../bad")).toEqual({ kind: "document", id: "test" });
  });
});
