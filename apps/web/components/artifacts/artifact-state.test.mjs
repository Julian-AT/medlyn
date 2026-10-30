import { describe, expect, it } from "vitest";
import { parseArtifact } from "./artifact-state.ts";

describe("artifact URL state", () => {
  it.each(["lens", "letter", "chart"])("restores a %s artifact", (kind) => {
    expect(parseArtifact(`${kind}:call_test-1`)).toEqual({ kind, id: "call_test-1" });
  });
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
  it.each(["passage:test", "document:test", "findings:test"])(
    "keeps source and findings views out of the artifact panel: %s",
    (value) => expect(parseArtifact(value)).toBeNull(),
  );
});
