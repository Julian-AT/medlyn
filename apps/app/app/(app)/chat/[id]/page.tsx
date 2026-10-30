import { loadChat } from "@medlyn/engine/agent/chat/history";
import { getDb } from "@medlyn/engine/db/client";
import { validateUIMessages } from "ai";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ChatConversation } from "@/components/chat/chat-conversation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { activePatientId } from "@/lib/patient-server";
import { visibleChatMessages } from "../../../api/chat/history-view";

export const metadata: Metadata = { title: "Conversation · Medlyn" };

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const patientId = await activePatientId();
  const owner = await getDb().query.chats.findFirst({
    where: (chat, { eq }) => eq(chat.id, id),
    columns: { patientId: true },
  });
  if (owner && owner.patientId !== patientId) notFound();
  try {
    const chat = await loadChat(id, patientId);
    const stored = visibleChatMessages(chat?.messages ?? []);
    // A brand-new chat has no history yet, and validateUIMessages rejects an empty list.
    const messages = stored.length ? await validateUIMessages({ messages: stored }) : [];
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
