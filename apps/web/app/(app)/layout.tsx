import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { PageHeader } from "@/components/shell/page-header";
import { WorkspaceProvider } from "@/components/shell/workspace-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <PageHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  );
}
