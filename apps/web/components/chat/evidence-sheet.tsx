"use client";

import { PassageView } from "@medlyn/engine/contracts";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function EvidenceSheet() {
  const [segmentId, setSegmentId] = useState<string | null>(null);
  const [passage, setPassage] = useState<PassageView | null>(null);
  const [language, setLanguage] = useState("de");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const show = (event: Event) => {
      const detail: unknown = (event as CustomEvent).detail;
      if (
        detail &&
        typeof detail === "object" &&
        "segmentId" in detail &&
        typeof detail.segmentId === "string"
      ) {
        setSegmentId(detail.segmentId);
      }
    };
    window.addEventListener("medlyn:show-source", show);
    return () => window.removeEventListener("medlyn:show-source", show);
  }, []);
  useEffect(() => {
    if (!segmentId) return;
    const controller = new AbortController();
    setPassage(null);
    setError(false);
    fetch(`/api/passage/${encodeURIComponent(segmentId)}?attempt=${attempt}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Source unavailable");
        const value = PassageView.parse(await response.json());
        if (!controller.signal.aborted) setPassage(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          console.warn("chat_source_unavailable", cause instanceof Error ? cause.name : "Unknown");
          setError(true);
        }
      });
    return () => controller.abort();
  }, [segmentId, attempt]);
  return (
    <Sheet open={segmentId !== null} onOpenChange={(open) => !open && setSegmentId(null)}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{passage?.document.titleEn ?? "Source evidence"}</SheetTitle>
          <SheetDescription>
            {passage
              ? `${passage.document.docDate} · ${passage.document.id}`
              : "Exact passage and surrounding context"}
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-6 pb-6">
          <ToggleGroup
            type="single"
            value={language}
            onValueChange={(value) => value && setLanguage(value)}
            aria-label="Source language"
          >
            <ToggleGroupItem value="de">German</ToggleGroupItem>
            <ToggleGroupItem value="en">English</ToggleGroupItem>
          </ToggleGroup>
          {error ? (
            <Alert>
              <AlertDescription>
                Couldn't load this source.{" "}
                <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : !passage ? (
            <Skeleton className="mt-4 h-48 w-full" />
          ) : (
            <Card className="mt-4 gap-3 bg-transparent ring-0">
              {[...passage.before, passage.segment, ...passage.after].map((segment) => (
                <Card
                  key={segment.id}
                  className={segment.id === segmentId ? "bg-muted" : "bg-transparent ring-0"}
                >
                  <CardHeader>
                    <CardTitle className="text-xs text-muted-foreground">
                      {segment.section ?? "Source passage"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription
                      lang={language}
                      className="whitespace-pre-wrap text-foreground"
                    >
                      {language === "de"
                        ? segment.text
                        : (segment.textEn ?? "Translation unavailable")}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </Card>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
