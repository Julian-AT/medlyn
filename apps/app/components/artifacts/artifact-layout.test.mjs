import { describe, expect, it } from "vitest";
import { getArtifactLayout } from "./artifact-layout.ts";

describe("artifact panel layout", () => {
  it.each([30, 45, 65])("uses the saved %s%% artifact width", (width) => {
    const layout = getArtifactLayout(true, width);
    expect(layout).toEqual({ conversation: 100 - width, artifact: width });
    expect(Object.values(layout).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("waits for the saved width before adding the artifact panel", () => {
    expect(getArtifactLayout(true, null)).toEqual({ conversation: 100 });
  });

  it.each([null, 30, 45, 65])("fills the conversation when closed or mobile (%s)", (width) => {
    expect(getArtifactLayout(false, width)).toEqual({ conversation: 100 });
  });

  it("restores the split after repeated open and close transitions", () => {
    for (let cycle = 0; cycle < 5; cycle++) {
      expect(getArtifactLayout(true, 62)).toEqual({ conversation: 38, artifact: 62 });
      expect(getArtifactLayout(false, 62)).toEqual({ conversation: 100 });
    }
  });
});
