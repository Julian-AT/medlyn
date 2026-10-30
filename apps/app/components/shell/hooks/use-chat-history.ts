"use client";

import { useEffect, useState } from "react";
import type { RecentChat } from "../chat-history";

export function useChatHistory() {
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/chat", { signal: controller.signal });
        if (!response.ok) throw new Error("History unavailable");
        const data: RecentChat[] = await response.json();
        if (!controller.signal.aborted) {
          setChats(data);
          setStatus("ready");
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("recent_chats_failed", error instanceof Error ? error.name : "Unknown");
          setStatus("failed");
        }
      }
    }
    void refresh();
    window.addEventListener("medlyn:chat-saved", refresh);
    return () => {
      controller.abort();
      window.removeEventListener("medlyn:chat-saved", refresh);
    };
  }, []);

  return {
    chats,
    status,
    remove: (id: string) => setChats((previous) => previous.filter((chat) => chat.id !== id)),
  };
}
