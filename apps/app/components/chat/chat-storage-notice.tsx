"use client";

import { useChatHistory } from "@/components/shell/hooks/use-chat-history";
import { CardDescription } from "@/components/ui/card";

export function ChatStorageNotice() {
  const { persistent, status } = useChatHistory();
  if (status === "loading" || persistent) return null;
  return (
    <CardDescription role="status" className="text-xs">
      Browser storage is unavailable. Chats are kept for this visit only.
    </CardDescription>
  );
}
