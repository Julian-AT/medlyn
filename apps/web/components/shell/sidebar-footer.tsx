"use client";

import {
  ArrowDown01Icon,
  Moon02Icon,
  RotateLeft01Icon,
  Sun03Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDate } from "@medlyn/engine/dates";
import Link from "next/link";
import { useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
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
  const { patient, patients, selectPatient } = useActivePatient();
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
    <SidebarFooter className="mt-auto px-3 pb-3 pt-1 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Patient and workspace settings"
                className="h-14 gap-2 rounded-[10px] border border-sidebar-border bg-card px-2 text-foreground data-open:bg-sidebar-accent group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent"
                aria-label="Patient and workspace settings"
              >
                <Avatar className="size-8 shrink-0 rounded-[10px]">
                  <AvatarFallback className="rounded-[10px] bg-secondary font-medium text-foreground">
                    {patient.displayName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <SidebarGroupContent className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden [&>span]:block [&>span]:truncate [&>span:first-child]:font-medium [&>span:last-child]:text-xs [&>span:last-child]:text-muted-foreground">
                  <span>{patient.displayName}</span>
                  <span>
                    {patient.sex} · as of {formatDate(patient.asOf)}
                  </span>
                </SidebarGroupContent>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="ml-auto group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" className="min-w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Patient workspace</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuRadioGroup
                value={patient.id}
                onValueChange={selectPatient}
                className="max-h-72 overflow-y-auto"
              >
                {patients.map((entry) => (
                  <DropdownMenuRadioItem key={entry.id} value={entry.id}>
                    {entry.displayName}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/research/cohort">
                    <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
                    Browse synthetic cohort
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuItem onSelect={toggleTheme}>
                  <HugeiconsIcon icon={dark ? Sun03Icon : Moon02Icon} strokeWidth={2} />
                  {dark ? "Light theme" : "Dark theme"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={resetting || !sessionId || reviews.count === 0}
                  onSelect={() => void reset()}
                >
                  <HugeiconsIcon icon={RotateLeft01Icon} strokeWidth={2} />
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
