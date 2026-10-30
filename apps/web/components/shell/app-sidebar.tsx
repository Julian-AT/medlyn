"use client";

import { RecentChats } from "@/components/chat/recent-chats";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useSidebarCounts } from "./hooks/use-sidebar-counts";
import { navigation } from "./navigation";
import { findingCounts } from "./sidebar-counts";
import { ShellSidebarFooter } from "./sidebar-footer";
import { CollapsibleSidebarGroup } from "./sidebar-group";
import { ShellSidebarHeader } from "./sidebar-header";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useWorkspace } from "./workspace-provider";

export function AppSidebar() {
  const { counts, findings } = useSidebarCounts();
  const { reviews } = useWorkspace();
  const activeFindings = findingCounts(reviews.screen?.findings ?? findings);
  const questions = reviews.screen?.openQuestions.filter(
    (question) => question.review?.action !== "dismissed",
  );
  const badges: Record<string, number | undefined> = {
    ...counts,
    "/open-questions": questions?.length ?? (findings.length > 0 ? activeFindings.open : undefined),
    "/reviews": reviews.count > 0 ? reviews.count : undefined,
  };

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <ShellSidebarHeader />
      <SidebarContent className="gap-5 pb-3 [&_[data-slot=sidebar-menu]]:gap-1">
        <SidebarGroup className="p-0 px-3 group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            <SidebarNavItem item={navigation[0].items[0]} />
          </SidebarMenu>
        </SidebarGroup>
        <RecentChats />
        {navigation.slice(1).map((group) => (
          <CollapsibleSidebarGroup
            key={group.label}
            id={group.label.toLowerCase().replaceAll(" ", "-")}
            label={group.label}
            defaultOpen={group.label !== "Research"}
          >
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  item={item}
                  count={badges[item.href]}
                  warning={item.href === "/open-questions" && activeFindings.contradictions}
                />
              ))}
            </SidebarMenu>
          </CollapsibleSidebarGroup>
        ))}
      </SidebarContent>
      <ShellSidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
