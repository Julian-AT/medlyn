"use client";

import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { useRouter } from "next/navigation";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { ChatComposer } from "@/components/chat/chat-composer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SHORTCUTS = [
  "Show her medications",
  "Weight trend",
  "Any contradictions?",
  "Draft the GP letter",
];

export function ChatHome() {
  const router = useRouter();
  function start(text: string, chipId?: string) {
    const id = crypto.randomUUID();
    sessionStorage.setItem(`medlyn:chat-draft:${id}`, JSON.stringify({ text, chipId }));
    router.push(`/chat/${id}`);
  }
  return (
    <Card className="mx-auto flex min-h-[calc(100svh-8rem)] w-full max-w-3xl justify-center bg-transparent ring-0">
      <CardHeader className="gap-3 pb-7">
        <CardDescription>Anna Musterfrau</CardDescription>
        <CardTitle className="text-3xl font-medium">
          What do you need for Anna Musterfrau?
        </CardTitle>
        <CardDescription>Ask a question. Every answer leads back to her documents.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <ChatComposer onSubmit={(text) => start(text)} />
        <Suggestions className="flex-wrap">
          {SHORTCUTS.map((text) => (
            <Suggestion key={text} suggestion={text} onClick={(value) => start(value)} />
          ))}
        </Suggestions>
        <CardDescription>Start with a situation</CardDescription>
        <Suggestions className="flex-wrap">
          {CHIPS.map((chip) => (
            <Suggestion
              key={chip.id}
              suggestion={chip.text}
              onClick={(text) => start(text, chip.id)}
            >
              {chip.label}
            </Suggestion>
          ))}
        </Suggestions>
      </CardContent>
    </Card>
  );
}
