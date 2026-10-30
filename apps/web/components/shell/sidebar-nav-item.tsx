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
          "h-8 gap-2 rounded-[10px] px-2 text-sm/5 font-medium text-sidebar-foreground hover:text-foreground [&_svg]:size-[18px] [&_svg]:text-sidebar-foreground",
          "data-active:bg-sidebar-accent data-active:text-foreground data-active:[&_svg]:text-foreground",
          warning && count !== undefined && "pr-10",
        )}
      >
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          onClick={() => setOpenMobile(false)}
        >
          <span className="-mx-0.5 flex h-8 min-w-5 shrink-0 items-center justify-center">
            <HugeiconsIcon icon={item.icon} strokeWidth={2} />
          </span>
          <span className="truncate">{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {warning && count !== undefined && (
        <SidebarMenuBadge
          className={cn("text-muted-foreground", warning && "bg-warning/10 text-warning")}
        >
          {count}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  );
}
