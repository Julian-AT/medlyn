"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { messageEvidence } from "../message-evidence";
import { useSpeechOutput, type ValidatedSpeech } from "./use-speech-output";

const Draft = z.object({
  text: z.string(),
  chipId: z.string().optional(),
  lensKey: z.string().optional(),
});

export function useChatConversation(id: string, initialMessages: UIMessage[]) {
  const { patient } = useActivePatient();
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingMessage, setSpeakingMessage] = useState<string | null>(null);
  const speech = useSpeechOutput();
  const speechEnabled = useRef(false);
  const investigationCompleted = useRef(false);
  speechEnabled.current = autoSpeak;
  const chat = useChat({
    id,
    messages: initialMessages,
    generateId: () => crypto.randomUUID(),
    transport: new DefaultChatTransport({ api: "/api/chat", body: { patientId: patient.id } }),
    onFinish: ({ message, isAbort, isError, isDisconnect }) => {
      investigationCompleted.current = !isAbort && !isError && !isDisconnect;
      window.dispatchEvent(new Event("medlyn:chat-saved"));
      if (speechEnabled.current && !isAbort && !isError && !isDisconnect) {
        setSpeakingMessage(message.id);
        void speech.speakAll(messageEvidence(message).speech);
      }
    },
  });
  const { sendMessage } = chat;
  useEffect(() => {
    if (initialMessages.length) return;
    const key = `medlyn:chat-draft:${id}`;
    let draft: z.infer<typeof Draft>;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      draft = Draft.parse(JSON.parse(raw));
    } catch (cause) {
      console.warn("chat_draft_invalid", cause instanceof Error ? cause.name : "Unknown");
      return;
    }
    // Deferred and cancelled on cleanup so Strict Mode's double effect sends the draft exactly once.
    const timer = window.setTimeout(() => {
      sessionStorage.removeItem(key);
      void sendMessage(
        { text: draft.text },
        { body: { chipId: draft.chipId, lensKey: draft.lensKey } },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, initialMessages.length, sendMessage]);
  return {
    ...chat,
    patient,
    autoSpeak,
    speakingMessage,
    speaking: speech.speaking,
    busy: chat.status === "submitted" || chat.status === "streaming",
    stopSpeech: speech.stop,
    setAutoSpeak(value: boolean) {
      setAutoSpeak(value);
      if (!value) speech.stop();
    },
    send(text: string) {
      speech.stop();
      return chat.sendMessage({ text });
    },
    async investigate(text: string) {
      investigationCompleted.current = false;
      speech.stop();
      await chat.sendMessage({ text });
      return investigationCompleted.current;
    },
    retry(messageId?: string) {
      speech.stop();
      chat.clearError();
      void chat.regenerate({ messageId });
    },
    read(messageId: string, receipts: ValidatedSpeech[]) {
      setSpeakingMessage(messageId);
      void speech.speakAll(receipts);
    },
    stop() {
      speech.stop();
      void chat.stop();
    },
  };
}
