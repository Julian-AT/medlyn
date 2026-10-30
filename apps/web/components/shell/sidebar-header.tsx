"use client";

import Link from "next/link";
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BrandMark } from "./brand-mark";

export function ShellSidebarHeader() {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarHeader className="px-3 pt-3 pb-2 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Medlyn home"
            className="h-9 gap-2 px-2 text-xl font-bold tracking-tight text-foreground hover:bg-transparent active:bg-transparent"
          >
            <Link href="/" onClick={() => setOpenMobile(false)}>
              <BrandMark />
              <span>Medlyn</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
