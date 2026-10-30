"use client";

import { BubbleChatIcon, Delete02Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { RecentChat } from "./chat-history";

export function ChatHistoryRow({
  chat,
  onDelete,
}: {
  chat: RecentChat;
  onDelete: (id: string) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const [deleting, setDeleting] = useState(false);
  const href = `/chat/${encodeURIComponent(chat.id)}`;

  async function remove() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/chat/${encodeURIComponent(chat.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("The chat could not be deleted. Try again.");
      onDelete(chat.id);
      if (pathname === href) router.push("/");
      toast.success("Chat deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat deletion unavailable");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        tooltip={chat.title}
        isActive={pathname === href}
        className="h-8 gap-2 rounded-[10px] px-2 text-sm/5 font-medium text-sidebar-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground [&_svg]:size-[18px] [&_svg]:text-foreground/70 data-active:[&_svg]:text-sidebar-accent-foreground"
      >
        <Link
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          onClick={() => setOpenMobile(false)}
        >
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={1.5} />
          <span>{chat.title}</span>
        </Link>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            aria-label={`Actions for ${chat.title}`}
            disabled={deleting}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={1.5} />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={deleting}
              onSelect={() => void remove()}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
              {deleting ? "Deleting…" : "Delete chat"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
