"use client";

import {
  ArrowDown01Icon,
  Moon02Icon,
  RotateLeft01Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { formatDate } from "@medlyn/engine/dates";
import { useState } from "react";
import { toast } from "sonner";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { patientAge } from "@/components/patient/patient-options";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  SidebarFooter,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { PatientSwitcher } from "./patient-switcher";
import { useWorkspace } from "./workspace-provider";

export function ShellSidebarFooter() {
  const { patient } = useActivePatient();
  const { reviews, theme, toggleTheme, sessionId } = useWorkspace();
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const age = patientAge(patient.birthDate, patient.asOf);
  const subtitle = [
    age === null ? null : `${age} y`,
    patient.asOf ? `as of ${formatDate(patient.asOf)}` : "As-of date unavailable",
  ]
    .filter(Boolean)
    .join(" · ");

  async function reset() {
    setResetting(true);
    try {
      await reviews.reset();
      setOpen(false);
    } catch (error) {
      console.warn("review_reset_failed", error instanceof Error ? error.name : "Unknown");
      toast.error("Couldn't reset reviews. Try again.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <SidebarFooter className="mt-auto px-3 pb-3 pt-1 group-data-[collapsible=icon]:px-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip="Patient and workspace settings"
                className="h-11 gap-2 rounded-[10px] px-2 text-foreground hover:bg-sidebar-accent data-open:bg-sidebar-accent group-data-[collapsible=icon]:h-8"
                aria-label={`${patient.displayName}, patient and workspace settings`}
              >
                <Avatar className="size-6 shrink-0 rounded-md">
                  <AvatarFallback className="rounded-md bg-muted text-[10px] font-medium text-foreground">
                    {patient.displayName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <SidebarGroupContent className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden [&>span]:block [&>span]:truncate [&>span:first-child]:font-medium [&>span:last-child]:text-xs [&>span:last-child]:text-muted-foreground">
                  <span>{patient.displayName}</span>
                  <span>{subtitle}</span>
                </SidebarGroupContent>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  strokeWidth={2}
                  className="ml-auto group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent
              side={isMobile ? "top" : "right"}
              align="end"
              className="w-80 gap-1 p-1"
            >
              <PatientSwitcher onSelect={() => setOpen(false)} />
              <Separator />
              <Button variant="ghost" className="justify-start" onClick={toggleTheme}>
                <HugeiconsIcon icon={theme === "dark" ? Sun03Icon : Moon02Icon} strokeWidth={2} />
                {theme === "dark" ? "Light theme" : "Dark theme"}
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                disabled={resetting || !sessionId || reviews.count === 0}
                onClick={() => void reset()}
              >
                <HugeiconsIcon icon={RotateLeft01Icon} strokeWidth={2} />
                {resetting ? "Resetting reviews…" : "Reset review layer"}
              </Button>
            </PopoverContent>
          </Popover>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
