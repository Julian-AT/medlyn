"use client";
import { Moon02Icon, RotateLeft01Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useWorkspace } from "./workspace-provider";
export function ShellSidebarFooter() {
  const { reviews, theme, toggleTheme } = useWorkspace();
  const dark = theme === "dark";
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={toggleTheme}>
            <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} />
            {dark ? "Light theme" : "Dark theme"}
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton onClick={() => void reviews.reset()}>
            <HugeiconsIcon icon={RotateLeft01Icon} />
            Reset review layer{reviews.count > 0 ? ` (${reviews.count})` : ""}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
