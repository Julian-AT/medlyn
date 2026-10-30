"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { ChatActivity } from "@/components/chat/chat-activity";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatMessage } from "@/components/chat/chat-message";
import { EvidenceSheet } from "@/components/chat/evidence-sheet";
import { useSpeechOutput } from "@/components/chat/hooks/use-speech-output";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";

const Speech = z.object({ speech: z.object({ text: z.string(), receipt: z.string() }).nullable() });
const Draft = z.object({
  text: z.string(),
  chipId: z.string().optional(),
  lensKey: z.string().optional(),
});

export function ChatConversation({
  id,
  initialMessages,
}: {
  id: string;
  initialMessages: UIMessage[];
}) {
  const [speak, setSpeak] = useState(false);
  const speech = useSpeechOutput();
  const speechEnabled = useRef(false);
  speechEnabled.current = speak;
  const started = useRef(false);
  // Transport and persistence lifecycle adapted from vercel/chatbot (Apache-2.0).
  const { messages, sendMessage, status, stop, error, clearError, regenerate } = useChat({
    id,
    messages: initialMessages,
    generateId: () => crypto.randomUUID(),
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onData: (part) => {
      if (part.type !== "data-validated" || !speechEnabled.current) return;
      const result = Speech.safeParse(part.data);
      if (result.success && result.data.speech) void speech.speak(result.data.speech);
    },
    onFinish: () => window.dispatchEvent(new Event("medlyn:chat-saved")),
  });
  useEffect(() => {
    if (started.current || initialMessages.length) return;
    started.current = true;
    const key = `medlyn:chat-draft:${id}`;
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    sessionStorage.removeItem(key);
    try {
      const draft = Draft.parse(JSON.parse(raw));
      void sendMessage(
        { text: draft.text },
        { body: { chipId: draft.chipId, lensKey: draft.lensKey } },
      );
    } catch (cause) {
      console.warn("chat_draft_invalid", cause instanceof Error ? cause.name : "Unknown");
    }
  }, [id, initialMessages.length, sendMessage]);
  const busy = status === "submitted" || status === "streaming";
  return (
    <Card className="mx-auto flex h-[calc(100svh-4rem)] min-h-0 w-full max-w-3xl gap-0 overflow-visible rounded-none bg-transparent py-0 shadow-none ring-0">
      <Conversation className="min-h-0">
        <ConversationContent className="gap-8 px-4 py-8 sm:px-8">
          {!messages.length && (
            <ConversationEmptyState
              title="Ask about Anna Musterfrau"
              description="Explore her documents, findings and open questions."
            />
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {busy && <ChatActivity message={messages.at(-1)} />}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to latest message" />
      </Conversation>
      <CardContent className="sticky bottom-0 z-10 shrink-0 space-y-3 bg-background px-4 pt-3 sm:px-8">
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              Couldn't complete this response.{" "}
              <Button
                variant="link"
                onClick={() => {
                  clearError();
                  void regenerate();
                }}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <ChatComposer
          status={status}
          onSubmit={(text) => sendMessage({ text })}
          onStop={() => {
            void stop();
            speech.stop();
          }}
        />
      </CardContent>
      <CardFooter className="shrink-0 flex-wrap justify-between gap-2 bg-background px-4 py-3 sm:px-8">
        <CardDescription className="text-xs">Answers linked to source documents</CardDescription>
        <Toggle
          size="sm"
          className="h-8 rounded-lg text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
          pressed={speak}
          onPressedChange={(value) => {
            setSpeak(value);
            if (!value) speech.stop();
          }}
          aria-label="Speak validated answers"
        >
          Speak answers
        </Toggle>
      </CardFooter>
      <EvidenceSheet />
    </Card>
  );
}
