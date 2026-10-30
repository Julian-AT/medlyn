"use client";

import type { UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ArtifactWorkspace } from "@/components/artifacts/artifact-workspace";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { ChatActivity } from "./chat-activity";
import { ChatComposer } from "./chat-composer";
import { ChatMessage } from "./chat-message";
import { useChatConversation } from "./hooks/use-chat-conversation";
import { useInvestigationQueue } from "./hooks/use-investigation-queue";

export function ChatConversation({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const chat = useChatConversation(id, initialMessages);
  const queue = useInvestigationQueue(chat.investigate, chat.stop);
  const busy = chat.busy || Boolean(queue.state?.running);
  return (
    <ArtifactWorkspace messages={chat.messages}>
      <Card className="flex h-full min-h-0 w-full gap-0 rounded-none border-0 bg-transparent py-0 shadow-none ring-0">
        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-8 px-5 py-8 sm:px-8">
            {!chat.messages.length && (
              <ConversationEmptyState
                title={`Ask about ${chat.patient.displayName}`}
                description="Explore documents, findings and open questions."
              />
            )}
            {chat.messages.map((message, index) => {
              const latest = index === chat.messages.length - 1;
              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  queue={queue}
                  autoOpenSources={!initialMessages.some((initial) => initial.id === message.id)}
                  busy={chat.busy && latest}
                  disabled={busy}
                  investigate={chat.messages[index - 1]?.parts.some(
                    (part) => part.type === "text" && /\binvestigat/i.test(part.text),
                  )}
                  onRetry={latest ? () => chat.retry(message.id) : undefined}
                  onFollowUp={
                    latest
                      ? (text) => {
                          void chat.send(text);
                        }
                      : undefined
                  }
                  onSpeak={(receipts) => chat.read(message.id, receipts)}
                  onStopSpeech={chat.stopSpeech}
                  speaking={chat.speakingMessage === message.id && chat.speaking}
                />
              );
            })}
            {chat.busy &&
              !chat.messages.at(-1)?.parts.some((part) => part.type.startsWith("tool-")) && (
                <ChatActivity message={chat.messages.at(-1)} />
              )}
          </ConversationContent>
          <ConversationScrollButton aria-label="Scroll to latest message" />
        </Conversation>
        <CardContent className="z-10 mx-auto w-full max-w-3xl shrink-0 space-y-3 bg-background px-5 pt-3 sm:px-8">
          {chat.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                Couldn't complete this response.{" "}
                <Button variant="link" onClick={() => chat.retry()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <ChatComposer
            status={queue.state?.running && !chat.busy ? "submitted" : chat.status}
            onSubmit={chat.send}
            onStop={queue.state?.running ? queue.stop : chat.stop}
          />
        </CardContent>
        <CardFooter className="mx-auto w-full max-w-3xl shrink-0 flex-wrap justify-between gap-2 bg-background px-5 py-3 sm:px-8">
          <CardDescription className="text-xs">Answers linked to source documents</CardDescription>
          <Toggle
            size="sm"
            className="h-8 rounded-lg text-xs font-medium data-[state=on]:bg-accent data-[state=on]:text-foreground"
            pressed={chat.autoSpeak}
            onPressedChange={chat.setAutoSpeak}
            aria-label="Speak validated answers"
          >
            Speak answers
          </Toggle>
        </CardFooter>
      </Card>
    </ArtifactWorkspace>
  );
}
