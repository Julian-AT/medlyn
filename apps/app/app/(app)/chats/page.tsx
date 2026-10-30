import type { Metadata } from "next";
import { ChatList } from "@/components/chat/chat-list";

export const metadata: Metadata = { title: "Chats" };

export default function ChatsPage() {
  return <ChatList />;
}
