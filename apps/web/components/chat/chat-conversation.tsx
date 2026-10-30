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
import { Reasoning, ReasoningTrigger } from "@/components/ai-elements/reasoning";
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
    <Card className="mx-auto h-[calc(100svh-7rem)] w-full max-w-3xl gap-0 bg-transparent py-0 ring-0">
      <Conversation>
        <ConversationContent className="px-4 py-8 sm:px-6">
          {!messages.length && (
            <ConversationEmptyState
              title="Ask about Anna Musterfrau"
              description="Explore her documents, findings and open questions."
            />
          )}
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {busy && (
            <Reasoning isStreaming>
              <ReasoningTrigger getThinkingMessage={() => "Checking source evidence…"} />
            </Reasoning>
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to latest message" />
      </Conversation>
      <CardContent className="px-4 sm:px-6">
        {error && (
          <Alert>
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
      <CardFooter className="justify-between px-4 py-3 sm:px-6">
        <CardDescription>Answers linked to source documents</CardDescription>
        <Toggle
          size="sm"
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
