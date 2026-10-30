"use client";

import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { InvestigationBridge } from "@/components/chat/investigation-bridge";
import { ChatHistoryRow } from "@/components/shell/chat-history-row";
import { useChatHistory } from "@/components/shell/hooks/use-chat-history";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

const VISIBLE_CHATS = 5;

export function RecentChats() {
  const { chats, status, remove } = useChatHistory();

  return (
    <>
      <InvestigationBridge />
      <SidebarGroup className="mt-auto p-0 px-3 group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel
          asChild
          className="group/history mb-1.5 ml-1.5 h-5 rounded-md px-0 text-sm/5 font-medium text-muted-foreground hover:text-foreground"
        >
          <Link href="/chats">
            History
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="ml-auto size-4 opacity-0 transition-opacity group-hover/history:opacity-100"
            />
          </Link>
        </SidebarGroupLabel>
        <SidebarMenu>
          {status === "loading" && <SidebarMenuSkeleton />}
          {chats.slice(0, VISIBLE_CHATS).map((chat) => (
            <ChatHistoryRow key={chat.id} chat={chat} onDelete={remove} />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
