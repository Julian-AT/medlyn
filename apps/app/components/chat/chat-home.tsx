"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatGreeting } from "@/components/chat/chat-greeting";
import { ChatShortcuts } from "@/components/chat/chat-shortcuts";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { chatDrafts } from "@/lib/chat-drafts";

export function ChatHome() {
  const router = useRouter();
  const { patient } = useActivePatient();
  const starting = useRef(false);
  function start(text: string, chipId?: string) {
    if (starting.current) return;
    const id = crypto.randomUUID();
    chatDrafts.save(patient.id, id, { text, chipId });
    starting.current = true;
    router.push(`/chat/${id}`);
  }
  return (
    <Card className="mx-auto flex w-full max-w-5xl flex-1 justify-center gap-9 overflow-visible border-0 bg-transparent px-5 py-12 shadow-none ring-0 sm:px-8 sm:py-16">
      <CardContent className="mx-auto flex w-full max-w-[650px] flex-col gap-9 px-0">
        <ChatGreeting />
        <ChatComposer onSubmit={(text) => start(text)} />
        <CardDescription className="-mt-6 text-center text-xs text-muted-foreground">
          Medlyn can make mistakes.
        </CardDescription>
      </CardContent>
      <ChatShortcuts onSelect={start} />
    </Card>
  );
}
