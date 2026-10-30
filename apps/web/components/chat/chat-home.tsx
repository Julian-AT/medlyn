"use client";

import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { useRouter } from "next/navigation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatGreeting } from "@/components/chat/chat-greeting";
import { ChatShortcuts } from "@/components/chat/chat-shortcuts";
import { Card, CardContent, CardDescription } from "@/components/ui/card";

export function ChatHome() {
  const router = useRouter();
  function start(text: string, chipId?: string) {
    const id = crypto.randomUUID();
    sessionStorage.setItem(`medlyn:chat-draft:${id}`, JSON.stringify({ text, chipId }));
    router.push(`/chat/${id}`);
  }
  return (
    <Card className="mx-auto flex min-h-[calc(100svh-50px)] w-full max-w-3xl justify-center gap-8 overflow-visible border-0 bg-transparent px-4 py-10 shadow-none ring-0 sm:px-8 sm:py-16">
      <ChatGreeting />
      <CardContent className="flex min-w-0 flex-col gap-7 px-0">
        <ChatComposer onSubmit={(text) => start(text)} />
        <ChatShortcuts onSelect={start} />
        <Card className="min-w-0 gap-3 rounded-none bg-transparent p-0 shadow-none ring-0">
          <CardDescription className="text-xs font-medium">Start with a situation</CardDescription>
          <Suggestions className="pb-3">
            {CHIPS.map((chip) => (
              <Suggestion
                key={chip.id}
                suggestion={chip.text}
                onClick={(text) => start(text, chip.id)}
                className="h-8 border-border bg-background font-medium shadow-none hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {chip.label}
              </Suggestion>
            ))}
          </Suggestions>
        </Card>
      </CardContent>
    </Card>
  );
}
