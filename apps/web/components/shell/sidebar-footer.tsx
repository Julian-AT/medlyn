"use client";

import {
  ArrowDown01Icon,
  Moon02Icon,
  RotateLeft01Icon,
  Sun03Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "./workspace-provider";

export function ShellSidebarFooter() {
  const { reviews, theme, toggleTheme, sessionId } = useWorkspace();
  const { isMobile } = useSidebar();
  const [resetting, setResetting] = useState(false);
  const dark = theme === "dark";

  async function reset() {
    setResetting(true);
    try {
      await reviews.reset();
    } finally {
      setResetting(false);
    }
  }

  return (
    <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Patient and workspace settings"
                className="h-16 rounded-[10px] px-2 data-open:bg-sidebar-accent group-data-[collapsible=icon]:h-8"
                aria-label="Patient and workspace settings"
              >
                <Avatar className="size-8 shrink-0 rounded-[10px]">
                  <AvatarFallback className="rounded-[10px] bg-primary/10 font-medium text-primary">
                    AM
                  </AvatarFallback>
                </Avatar>
                <SidebarGroupContent className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden [&>span]:block [&>span]:truncate [&>span:first-child]:font-medium [&>span:last-child]:text-xs [&>span:last-child]:text-muted-foreground">
                  <span>Anna Musterfrau</span>
                  <span>F · 57 y · as of 15 Apr 2016</span>
                </SidebarGroupContent>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={1.75}
                  className="ml-auto group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="min-w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Patient workspace</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuRadioGroup value="patient-0000-0001">
                <DropdownMenuRadioItem value="patient-0000-0001">
                  Anna Musterfrau
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/research/cohort">
                    <HugeiconsIcon icon={UserGroupIcon} strokeWidth={1.75} />
                    Browse synthetic cohort
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuItem onSelect={toggleTheme}>
                  <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} strokeWidth={1.75} />
                  {dark ? "Light theme" : "Dark theme"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={resetting || !sessionId || reviews.count === 0}
                  onSelect={() => void reset()}
                >
                  <HugeiconsIcon icon={RotateLeft01Icon} strokeWidth={1.75} />
                  {resetting
                    ? "Resetting reviews…"
                    : `Reset review layer${reviews.count > 0 ? ` (${reviews.count})` : ""}`}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
