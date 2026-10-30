"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { navigation } from "./navigation";

type NavItem = (typeof navigation)[number]["items"][number];

export function SidebarNavItem({
  item,
  count,
  warning = false,
}: {
  item: NavItem;
  count?: number;
  warning?: boolean;
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const active = pathname === item.href || (item.href === "/" && pathname.startsWith("/chat/"));

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className={cn(
          "h-9 gap-2.5 rounded-[10px] px-2.5 text-sm/5 font-medium text-muted-foreground hover:text-foreground [&_svg]:size-[18px] [&_svg]:text-muted-foreground",
          "data-active:bg-sidebar-accent data-active:text-foreground data-active:[&_svg]:text-foreground",
          count !== undefined && "pr-12",
        )}
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpenMobile(false)}
        >
          <HugeiconsIcon icon={item.icon} strokeWidth={2} />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {count !== undefined && (
        <SidebarMenuBadge
          className={cn("text-muted-foreground", warning && "bg-warning text-warning-foreground")}
        >
          {count}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}
