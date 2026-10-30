"use client";

import { useEffect, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { chatStore } from "@/lib/chat-store";
import type { RecentChat } from "../chat-history";

export function useChatHistory() {
  const { patient } = useActivePatient();
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [persistent, setPersistent] = useState(true);

  useEffect(() => {
    const store = chatStore();
    function refresh() {
      setChats(
        store.list(patient.id).map((chat) => ({
          id: chat.id,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          searchText: chat.messages
            .flatMap((message) =>
              message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])),
            )
            .join(" "),
        })),
      );
      setPersistent(store.isPersistent());
      setStatus("ready");
    }
    refresh();
    const unsubscribe = store.subscribe(refresh);
    window.addEventListener("storage", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", refresh);
    };
  }, [patient.id]);

  return {
    chats,
    status,
    persistent,
    remove: (id: string) => chatStore().remove(patient.id, id),
  };
}
