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
          "h-8 gap-2 rounded-[10px] px-2 text-sm/5 font-medium text-sidebar-foreground [&_svg]:size-[18px] [&_svg]:text-foreground/70",
          "data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:[&_svg]:text-sidebar-accent-foreground",
          count !== undefined && "pr-12",
        )}
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpenMobile(false)}
        >
          <HugeiconsIcon icon={item.icon} strokeWidth={1.5} />
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
