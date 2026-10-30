"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatGreeting } from "@/components/chat/chat-greeting";
import { ChatShortcuts } from "@/components/chat/chat-shortcuts";
import { Card, CardContent } from "@/components/ui/card";

export function ChatHome() {
  const router = useRouter();
  const starting = useRef(false);
  function start(text: string, chipId?: string) {
    if (starting.current) return;
    const id = crypto.randomUUID();
    sessionStorage.setItem(`medlyn:chat-draft:${id}`, JSON.stringify({ text, chipId }));
    starting.current = true;
    router.push(`/chat/${id}`);
  }
  return (
    <Card className="mx-auto flex w-full max-w-5xl gap-0 overflow-visible border-0 bg-transparent px-5 pb-10 pt-12 shadow-none ring-0 sm:px-8 sm:pt-[9svh]">
      <CardContent className="mx-auto flex w-full max-w-[650px] flex-col gap-5 px-0 pb-8 sm:pb-10">
        <ChatGreeting />
        <ChatComposer onSubmit={(text) => start(text)} />
      </CardContent>
      <ChatShortcuts onSelect={start} />
    </Card>
  );
}
