"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { InvestigationBridge } from "@/components/chat/investigation-bridge";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type RecentChat = { id: string; title: string };

export function RecentChats() {
  const pathname = usePathname();
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch("/api/chat", { signal: controller.signal });
        if (!response.ok) throw new Error("History unavailable");
        setChats(await response.json());
        setFailed(false);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("recent_chats_failed", error instanceof Error ? error.name : "Unknown");
          setFailed(true);
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
  return (
    <SidebarGroup>
      <InvestigationBridge />
      <SidebarGroupLabel>{failed ? "Recent chats unavailable" : "Recent chats"}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {chats.map((chat) => (
            <SidebarMenuItem key={chat.id}>
              <SidebarMenuButton
                asChild
                isActive={pathname === `/chat/${chat.id}`}
                tooltip={chat.title}
              >
                <Link href={`/chat/${chat.id}`}>
                  <span>{chat.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
