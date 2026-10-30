"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
    <SidebarHeader className="gap-0 px-3 pb-3 pt-0 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Medlyn home"
            className="h-[50px] gap-2 rounded-none px-2 text-base font-semibold tracking-tight text-foreground hover:bg-transparent"
          >
            <Link href="/" onClick={() => setOpenMobile(false)}>
              <BrandMark />
              <span>Medlyn</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Button
        asChild
        className="h-8 justify-start gap-2 rounded-[10px] px-2 text-sm font-medium group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:[&>span]:hidden"
      >
        <Link href="/" aria-label="New chat" onClick={() => setOpenMobile(false)}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.5} data-icon="inline-start" />
          <span>New chat</span>
        </Link>
      </Button>
    </SidebarHeader>
  );
}
