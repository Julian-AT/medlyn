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
          "h-8 rounded-[10px] text-sm font-medium [&_svg]:size-[18px] [&_svg]:text-foreground/80",
          "data-active:bg-primary/10 data-active:text-primary data-active:[&_svg]:text-primary",
          count !== undefined && "pr-12",
        )}
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpenMobile(false)}
        >
          <HugeiconsIcon icon={item.icon} strokeWidth={1.75} />
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
