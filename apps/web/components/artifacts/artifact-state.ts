export const artifactKinds = ["lens", "letter", "chart"] as const;
export type ArtifactKind = (typeof artifactKinds)[number];
export type Artifact = { kind: ArtifactKind; id: string; segmentId?: string };

export function parseArtifact(value: string | null, segmentId?: string | null): Artifact | null {
  if (!value) return null;
  const colon = value.indexOf(":");
  const kind = value.slice(0, colon);
  const id = value.slice(colon + 1);
  if (!artifactKinds.some((item) => item === kind) || !/^[a-zA-Z0-9_-]{1,200}$/.test(id))
    return null;
  return {
    kind: kind as ArtifactKind,
    id,
    ...(segmentId && /^[a-zA-Z0-9_-]{1,200}$/.test(segmentId) ? { segmentId } : {}),
  };
}

export function openArtifact(
  artifact: Artifact | { kind: "passage" | "document"; id: string; segmentId?: string },
) {
  if (artifact.kind === "passage") {
    window.dispatchEvent(
      new CustomEvent("medlyn:show-source", { detail: { segmentId: artifact.id } }),
    );
    return;
  }
  if (artifact.kind === "document") {
    window.dispatchEvent(new CustomEvent("medlyn:show-document", { detail: artifact }));
    return;
  }
  window.dispatchEvent(new CustomEvent("medlyn:open-artifact", { detail: artifact }));
}
