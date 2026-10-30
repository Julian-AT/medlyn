import type { Layout } from "react-resizable-panels";

export function getArtifactLayout(showArtifact: boolean, width: number | null): Layout {
  if (!showArtifact || width === null) return { conversation: 100 };
  return { conversation: 100 - width, artifact: width };
}
