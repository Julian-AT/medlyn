"use client";

import type { UIMessage } from "ai";
import type { ReactNode } from "react";
import { SourceNavigationDialog } from "@/components/sources/source-navigation-dialog";
import { Card } from "@/components/ui/card";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { getArtifactLayout } from "./artifact-layout";
import { ArtifactPanel } from "./artifact-panel";
import { useArtifact } from "./hooks/use-artifact";

export function ArtifactWorkspace({
  children,
  messages,
}: {
  children: ReactNode;
  messages: UIMessage[];
}) {
  const { artifact, select, width, rememberWidth } = useArtifact();
  const mobile = useIsMobile();
  const close = () => select(null);
  const layout = getArtifactLayout(Boolean(artifact) && !mobile, width);
  const split = layout.artifact !== undefined;
  return (
    <Card className="h-[calc(100svh-50px)] min-h-0 w-full gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
      <SourceNavigationDialog />
      <ResizablePanelGroup
        orientation="horizontal"
        defaultLayout={layout}
        onLayoutChanged={(layout, meta) => {
          if (split && meta.isUserInteraction) rememberWidth(layout.artifact);
        }}
      >
        <ResizablePanel
          id="conversation"
          defaultSize={`${layout.conversation}%`}
          minSize="35%"
          className="min-w-0"
        >
          {children}
        </ResizablePanel>
        {artifact && split && (
          <>
            <ResizableHandle className="bg-border/60" />
            <ResizablePanel
              id="artifact"
              defaultSize={`${layout.artifact}%`}
              minSize="30%"
              maxSize="65%"
              className="min-w-0"
            >
              <ArtifactPanel artifact={artifact} messages={messages} onClose={close} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {mobile && (
        <Sheet open={Boolean(artifact)} onOpenChange={(open) => !open && close()}>
          <SheetContent
            className="w-full gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-full"
            showCloseButton={false}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Chat artifact</SheetTitle>
              <SheetDescription>
                Expanded situation lenses, letters and charts from this conversation.
              </SheetDescription>
            </SheetHeader>
            {artifact && <ArtifactPanel artifact={artifact} messages={messages} onClose={close} />}
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
}
