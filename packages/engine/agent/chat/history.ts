import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../db/client.ts";
import { chatMessages, chats } from "../../db/schema.ts";
import { PATIENT_ID } from "../../store.ts";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  parts: Record<string, unknown>[];
};

export function chatTitle(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 80) || "New conversation";
}

export async function recentChats(patientId = PATIENT_ID) {
  return getDb()
    .select()
    .from(chats)
    .where(eq(chats.patientId, patientId))
    .orderBy(desc(chats.updatedAt))
    .limit(20);
}

export async function loadChat(id: string, patientId = PATIENT_ID) {
  const [chat] = await getDb()
    .select()
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.patientId, patientId)))
    .limit(1);
  if (!chat) return null;
  const messages = await getDb()
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, id))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id));
  return {
    ...chat,
    messages: messages.map((message) => ({
      ...message,
      id:
        message.role === "user" && message.id.startsWith(`${id}:`)
          ? message.id.slice(id.length + 1)
          : message.id,
    })),
  };
}

// Adapted from vercel/chatbot lib/db/queries.ts (Apache-2.0).
export async function saveUserMessage(id: string, message: StoredMessage, patientId = PATIENT_ID) {
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => String(part.text ?? ""))
    .join(" ");
  const db = getDb();
  await db.batch([
    db
      .insert(chats)
      .values({ id, patientId, title: chatTitle(text) })
      .onConflictDoNothing({ target: chats.id }),
    db
      .insert(chatMessages)
      .values({ ...message, id: `${id}:${message.id}`, chatId: id })
      .onConflictDoNothing({ target: chatMessages.id }),
    db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(and(eq(chats.id, id), eq(chats.patientId, patientId))),
  ]);
}

export async function saveAssistantMessage(id: string, message: StoredMessage) {
  const db = getDb();
  await db.batch([
    db
      .insert(chatMessages)
      .values({ ...message, chatId: id })
      .onConflictDoNothing({ target: chatMessages.id }),
    db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, id)),
  ]);
}
