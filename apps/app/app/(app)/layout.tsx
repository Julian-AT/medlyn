import type { ReactNode } from "react";
import { ActivePatientProvider } from "@/components/patient/active-patient-provider";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { PageHeader } from "@/components/shell/page-header";
import { WorkspaceProvider } from "@/components/shell/workspace-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { activePatientId, patientList } from "@/lib/patient-server";
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [id, patients] = await Promise.all([activePatientId(), patientList()]);
  const patient = patients.find((entry) => entry.id === id) ?? patients[0];
  if (!patient) throw new Error("No patient documents are available");
  return (
    <ActivePatientProvider key={patient.id} patient={patient} patients={patients}>
      <WorkspaceProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <PageHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </WorkspaceProvider>
    </ActivePatientProvider>
  );
}
