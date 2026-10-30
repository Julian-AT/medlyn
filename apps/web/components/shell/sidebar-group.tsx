"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useSidebarGroup } from "./hooks/use-sidebar-group";

export function CollapsibleSidebarGroup({
  id,
  label,
  defaultOpen = true,
  children,
  hideWhenCollapsed = false,
}: {
  id: string;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
  hideWhenCollapsed?: boolean;
}) {
  const preference = useSidebarGroup(id, defaultOpen);
  const { state, isMobile } = useSidebar();
  const iconOnly = state === "collapsed" && !isMobile;

  return (
    <Collapsible asChild {...preference} open={iconOnly || preference.open}>
      <SidebarGroup
        className={cn(
          "p-0 px-3 group-data-[collapsible=icon]:px-2",
          hideWhenCollapsed && "group-data-[collapsible=icon]:hidden",
        )}
      >
        <SidebarGroupLabel
          asChild
          className="mb-1 h-8 rounded-[10px] px-2 text-sm/5 font-medium text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:hidden"
        >
          <CollapsibleTrigger className="group/section gap-2">
            {label}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={2}
              className="ml-auto size-4 opacity-0 transition group-hover/section:opacity-100 group-focus-visible/section:opacity-100 group-data-[state=closed]/section:-rotate-90 motion-reduce:transition-none"
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>{children}</SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
