"use client";

import type { UIMessage } from "ai";
import { type ReactNode, useEffect, useRef } from "react";
import type { GroupImperativeHandle } from "react-resizable-panels";
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
  const group = useRef<GroupImperativeHandle>(null);
  const split = Boolean(artifact) && !mobile;
  useEffect(() => {
    if (split) group.current?.setLayout({ conversation: 100 - width, artifact: width });
  }, [split, width]);
  return (
    <Card className="h-[calc(100svh-50px)] min-h-0 w-full gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0">
      <ResizablePanelGroup
        orientation="horizontal"
        groupRef={group}
        onLayoutChanged={(layout, meta) => {
          if (artifact && !mobile && meta.isUserInteraction) rememberWidth(layout.artifact);
        }}
      >
        <ResizablePanel id="conversation" minSize="35%" className="min-w-0">
          {children}
        </ResizablePanel>
        {artifact && !mobile && (
          <>
            <ResizableHandle className="bg-border/60" />
            <ResizablePanel
              id="artifact"
              defaultSize={`${width}%`}
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
                Source documents and expanded views from this conversation.
              </SheetDescription>
            </SheetHeader>
            {artifact && <ArtifactPanel artifact={artifact} messages={messages} onClose={close} />}
          </SheetContent>
        </Sheet>
      )}
    </Card>
  );
}
