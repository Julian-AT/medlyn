"use client";

import { useEffect, useState } from "react";
import { InvestigationBridge } from "@/components/chat/investigation-bridge";
import { groupChats } from "@/components/shell/chat-history";
import { ChatHistoryRow } from "@/components/shell/chat-history-row";
import { useChatHistory } from "@/components/shell/hooks/use-chat-history";
import { CollapsibleSidebarGroup } from "@/components/shell/sidebar-group";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { SidebarGroupLabel, SidebarMenu, SidebarMenuSkeleton } from "@/components/ui/sidebar";

export function RecentChats() {
  const { chats, status, remove } = useChatHistory();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <InvestigationBridge />
      <CollapsibleSidebarGroup id="history" label="History" hideWhenCollapsed>
        {status === "loading" && <SidebarMenuSkeleton />}
        {status === "failed" && (
          <Empty className="gap-2 border-0 px-3 py-2">
            <EmptyDescription>Chat history couldn’t load.</EmptyDescription>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("medlyn:chat-saved"))}
            >
              Try again
            </Button>
          </Empty>
        )}
        {status === "ready" && chats.length === 0 && (
          <Empty className="border-0 px-3 py-2">
            <EmptyDescription>Your chats will appear here.</EmptyDescription>
          </Empty>
        )}
        {now &&
          groupChats(chats, now).map((group) => (
            <SidebarMenu key={group.label} className="pb-2">
              <SidebarGroupLabel asChild className="h-7 text-xs text-muted-foreground">
                <li>{group.label}</li>
              </SidebarGroupLabel>
              {group.chats.map((chat) => (
                <ChatHistoryRow key={chat.id} chat={chat} onDelete={remove} />
              ))}
            </SidebarMenu>
          ))}
      </CollapsibleSidebarGroup>
    </>
  );
}
