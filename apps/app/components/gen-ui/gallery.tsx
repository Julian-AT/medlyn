"use client";

import type { UIMessage } from "ai";
import { useState } from "react";
import { ArtifactWorkspace } from "@/components/artifacts/artifact-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toggle } from "@/components/ui/toggle";
import { GalleryStateView } from "./gallery-state";
import { type GalleryLoader, type GalleryResult, galleryTools } from "./gallery-tools";
import { useGalleryStreaming } from "./hooks/use-gallery-streaming";

export function GenUiGallery({ loadAction }: { loadAction: GalleryLoader }) {
  const [results, setResults] = useState<GalleryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [simulate, setSimulate] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const simulatedState = useGalleryStreaming(simulate);
  async function load() {
    setLoading(true);
    setError(false);
    try {
      setResults(await loadAction());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  const messages: UIMessage[] = [
    {
      id: "dev-gen-ui-gallery",
      role: "assistant",
      parts: results.map(({ part }) => part),
    },
  ];
  return (
    <ArtifactWorkspace messages={messages}>
      <ScrollArea className="h-full">
        <CardContent className="flex min-w-0 flex-col gap-6 p-4 md:p-6">
          <Card className="gap-4 rounded-2xl border p-4 shadow-none ring-0">
            <CardHeader className="p-0">
              <CardTitle className="text-lg">Generative UI review</CardTitle>
              <CardDescription>
                Development only. All nine tools, four states, one size scale. Live outputs use the
                active patient's evidence window; loading also creates a gallery-session GP draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 p-0">
              <Button className="h-9 rounded-control" onClick={load} disabled={loading}>
                {loading ? "Loading patient views…" : "Load patient views"}
              </Button>
              <Toggle
                variant="outline"
                className="h-9 rounded-control"
                pressed={simulate}
                onPressedChange={setSimulate}
                disabled={!results.length || loading}
              >
                Simulate streaming
              </Toggle>
              <Toggle
                variant="outline"
                className="h-9 rounded-control"
                pressed={expanded}
                onPressedChange={setExpanded}
              >
                Expanded views
              </Toggle>
            </CardContent>
            {error ? (
              <Alert variant="destructive" className="rounded-control">
                <AlertTitle>Patient views unavailable</AlertTitle>
                <AlertDescription>
                  Check the development database connection, then reload the views.
                </AlertDescription>
              </Alert>
            ) : null}
          </Card>
          {galleryTools.map(({ name, title, input }) => {
            const result = results.find((entry) => entry.name === name);
            return (
              <Card key={name} className="gap-4 rounded-2xl border p-4 shadow-none ring-0">
                <CardHeader className="p-0">
                  <CardTitle className="text-sm">{title}</CardTitle>
                  {result?.part.state === "output-error" ? (
                    <CardDescription className="text-xs text-destructive">
                      Live data failed to load for this view.
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="grid min-w-0 gap-6 p-0 xl:grid-cols-2">
                  {(
                    [
                      "input-streaming",
                      "input-available",
                      "output-available",
                      "output-error",
                    ] as const
                  ).map((state) => (
                    <GalleryStateView
                      key={state}
                      name={name}
                      input={input}
                      state={simulate && state === "output-available" ? simulatedState : state}
                      result={result}
                      expanded={expanded}
                    />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </ScrollArea>
    </ArtifactWorkspace>
  );
}
