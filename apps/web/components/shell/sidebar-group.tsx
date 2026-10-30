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
        className={hideWhenCollapsed ? "group-data-[collapsible=icon]:hidden" : undefined}
      >
        <SidebarGroupLabel
          asChild
          className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
        >
          <CollapsibleTrigger className="group/section gap-2">
            {label}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              strokeWidth={1.75}
              className="ml-auto transition-transform group-data-[state=closed]/section:-rotate-90 motion-reduce:transition-none"
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
