"use client";

import { type UIMessage, validateUIMessages } from "ai";
import { useEffect, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { chatStore } from "@/lib/chat-store";
import { ChatConversation } from "./chat-conversation";

export function LocalChat({ id }: { id: string }) {
  const { patient } = useActivePatient();
  const [history, setHistory] = useState<{ messages: UIMessage[]; invalid: boolean } | null>(null);
  useEffect(() => {
    let active = true;
    const stored = chatStore().load(patient.id, id);
    const load = async () => {
      try {
        const messages = stored?.messages.length
          ? await validateUIMessages({ messages: stored.messages })
          : [];
        if (active) setHistory({ messages, invalid: false });
      } catch {
        if (active) setHistory({ messages: [], invalid: true });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [id, patient.id]);
  if (!history) return <Skeleton className="mx-auto mt-8 h-32 w-full max-w-3xl" />;
  if (history.invalid)
    return (
      <Alert>
        <AlertDescription>
          This saved chat couldn't be read. Start a new chat from Home.
        </AlertDescription>
      </Alert>
    );
  return (
    <ChatConversation key={`${patient.id}:${id}`} id={id} initialMessages={history.messages} />
  );
}
