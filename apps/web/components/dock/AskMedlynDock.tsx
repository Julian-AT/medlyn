"use client";

import { AssistantRuntimeProvider, ThreadPrimitive } from "@assistant-ui/react";
import { Volume2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { DockActions } from "./DockActions.tsx";
import { DockComposer } from "./DockComposer.tsx";
import { DockEmpty } from "./DockEmpty.tsx";
import { AssistantMessage, Citations, UserMessage } from "./DockMessages.tsx";
import { ToolSteps } from "./ToolSteps.tsx";
import { useDockRuntime } from "./hooks/use-dock-runtime.ts";
import { useTranscriptScroll } from "./hooks/use-transcript-scroll.ts";

type Props = { lensKey: string | null; sessionId: string };

function Dock({ lensKey, sessionId }: Props) {
  const dock = useDockRuntime(lensKey, sessionId);
  const transcript = useTranscriptScroll();
  return (
    <AssistantRuntimeProvider runtime={dock.runtime}>
      <Citations.Provider value={dock.citations}>
        <Card id="ask-medlyn-dock" tabIndex={0} aria-label="Ask Medlyn, hold Space to talk">
          <CardHeader>
            <CardTitle>Ask Medlyn</CardTitle>
            <CardDescription>Investigate one question with its sources</CardDescription>
            <CardAction>
              <Toggle
                variant="outline"
                size="sm"
                pressed={dock.speakEnabled}
                onPressedChange={dock.toggleSpeech}
                aria-label="Speak validated answers"
              >
                <Volume2 data-icon="inline-start" />
                Speak {dock.speakEnabled ? "on" : "off"}
              </Toggle>
            </CardAction>
          </CardHeader>
          <ToolSteps />
          <ThreadPrimitive.Root>
            <ScrollArea ref={transcript} className="h-80" aria-label="Investigation transcript">
              <CardContent aria-live="polite">
                <ThreadPrimitive.Empty>
                  <DockEmpty
                    onSelect={(question) => dock.runtime.thread.composer.setText(question)}
                  />
                </ThreadPrimitive.Empty>
                <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
              </CardContent>
            </ScrollArea>
            <DockActions
              answer={dock.busy ? null : dock.answer}
              lensKey={lensKey}
              sessionId={sessionId}
              onLeaveOpen={dock.leaveOpen}
            />
            {dock.busy ? (
              <CardContent role="status">
                <Badge variant="secondary">
                  <Spinner />
                  Checking sources and validating…
                </Badge>
              </CardContent>
            ) : null}
            {dock.error ? (
              <CardContent>
                <Alert variant="destructive">
                  <AlertDescription>{dock.error}</AlertDescription>
                </Alert>
              </CardContent>
            ) : null}
            <DockComposer busy={dock.busy} runtime={dock.runtime} />
          </ThreadPrimitive.Root>
        </Card>
      </Citations.Provider>
    </AssistantRuntimeProvider>
  );
}

export function AskMedlynDock(props: Props) {
  return <Dock key={`${props.sessionId}:${props.lensKey}`} {...props} />;
}
