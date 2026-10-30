"use client";

import {
  Activity,
  CalendarDays,
  ChevronRight,
  HeartPulse,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";
import type { Screen } from "@medlyn/engine/contracts";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { formatDate } from "@medlyn/engine/dates";
import { ageAt } from "@/lib/lens-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type Props = {
  screen: Screen | null;
  activeChip: string | null;
  theme: string;
  reviewCount: number;
  onSituation: (text: string, chipId: string) => void;
  onSource: (id: string) => void;
  onTheme: () => void;
  onReset: () => void;
};

export function AppSidebar({
  screen,
  activeChip,
  theme,
  reviewCount,
  onSituation,
  onSource,
  onTheme,
  onReset,
}: Props) {
  const asOf = screen?.window.asOf ?? "2016-04-15";
  return (
    <Sidebar variant="inset" collapsible="offcanvas" className="print:hidden">
      <SidebarHeader className="gap-5 px-4 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <a href="/" aria-label="Medlyn home">
                <HeartPulse />
                <span>Medlyn</span>
                <Badge variant="outline" className="ml-auto">
                  Clinical
                </Badge>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <Card size="sm">
          <CardHeader>
            <Avatar>
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <CardTitle>{screen?.patient.displayName ?? "Anna Musterfrau"}</CardTitle>
            <CardDescription>Patient record · {screen?.patient.sex ?? "F"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              disabled={!screen?.patient.birthDateSegmentId}
              onClick={() =>
                screen?.patient.birthDateSegmentId && onSource(screen.patient.birthDateSegmentId)
              }
            >
              {screen ? ageAt(screen.patient.birthDate, asOf) : 57} y as of {formatDate(asOf)}
              <ChevronRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clinical situations</SidebarGroupLabel>
          <SidebarMenu>
            {CHIPS.map((chip) => (
              <SidebarMenuItem key={chip.id}>
                <SidebarMenuButton
                  isActive={activeChip === chip.id}
                  tooltip={chip.label}
                  onClick={() => onSituation(chip.text, chip.id)}
                >
                  <Activity />
                  <span>{chip.label}</span>
                  {activeChip === chip.id && <ChevronRight className="ml-auto" />}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Evidence window</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <span>
                  <CalendarDays />
                  <span>As of {formatDate(asOf)}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="gap-3 p-4">
        <Separator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              <span>Switch to {theme === "dark" ? "light" : "dark"} theme</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onReset} disabled={!reviewCount}>
              <RotateCcw />
              <span>Reset review layer</span>
              <Badge variant="secondary" className="ml-auto">
                {reviewCount}
              </Badge>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
