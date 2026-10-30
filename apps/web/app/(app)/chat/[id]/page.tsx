import { loadChat } from "@medlyn/engine/agent/chat/history";
import { validateUIMessages } from "ai";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  try {
    const chat = await loadChat(id);
    const messages = await validateUIMessages({ messages: chat?.messages ?? [] });
    return <ChatConversation key={id} id={id} initialMessages={messages} />;
  } catch (error) {
    console.warn("chat_page_unavailable", error instanceof Error ? error.name : "Unknown");
    return (
      <Alert>
        <AlertDescription>Chat history is unavailable. Refresh to try again.</AlertDescription>
      </Alert>
    );
  }
}
