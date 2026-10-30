"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { chatDrafts } from "@/lib/chat-drafts";
import { chatStore } from "@/lib/chat-store";
import { messageEvidence } from "../message-evidence";
import { useSpeechOutput, type ValidatedSpeech } from "./use-speech-output";

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
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { patientId: patient.id },
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.any([
            ...(init?.signal ? [init.signal] : []),
            AbortSignal.timeout(50_000),
          ]),
        }),
    }),
    onFinish: ({ message, messages, isAbort, isError, isDisconnect }) => {
      investigationCompleted.current = !isAbort && !isError && !isDisconnect;
      chatStore().save(patient.id, id, messages);
      if (speechEnabled.current && !isAbort && !isError && !isDisconnect) {
        setSpeakingMessage(message.id);
        void speech.speakAll(messageEvidence(message).speech);
      }
    },
  });
  const { sendMessage } = chat;
  useEffect(() => {
    if (chat.status !== "streaming") chatStore().save(patient.id, id, chat.messages);
  }, [id, patient.id, chat.messages, chat.status]);
  useEffect(() => {
    if (initialMessages.length) return;
    // Deferred and cancelled on cleanup so Strict Mode's double effect sends the draft exactly once.
    const timer = window.setTimeout(() => {
      const draft = chatDrafts.take(patient.id, id);
      if (!draft) return;
      void sendMessage(
        { text: draft.text },
        { body: { chipId: draft.chipId, lensKey: draft.lensKey } },
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, patient.id, initialMessages.length, sendMessage]);
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
