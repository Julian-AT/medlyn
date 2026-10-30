import type { Metadata } from "next";
import { ChatHome } from "@/components/chat/chat-home";

export const metadata: Metadata = { title: "Ask Medlyn · Medlyn" };

export default function Page() {
  return <ChatHome />;
}
