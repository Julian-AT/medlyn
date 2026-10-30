"use client";

import { Activity01Icon, Add01Icon } from "@hugeicons/core-free-icons";
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

export function ShellSidebarHeader() {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarHeader className="gap-3 px-2 pb-3 pt-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip="Medlyn home"
            className="h-9 text-base font-semibold [&_svg]:size-5 [&_svg]:text-primary"
          >
            <Link href="/" onClick={() => setOpenMobile(false)}>
              <HugeiconsIcon icon={Activity01Icon} strokeWidth={1.75} />
              <span>Medlyn</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <Button
        asChild
        className="h-8 justify-start gap-2 rounded-[10px] px-3 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:[&>span]:hidden"
      >
        <Link href="/" aria-label="New chat" onClick={() => setOpenMobile(false)}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={1.75} data-icon="inline-start" />
          <span>New chat</span>
        </Link>
      </Button>
    </SidebarHeader>
  );
}
