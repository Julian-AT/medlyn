import type { Metadata } from "next";
import { WorkflowPage } from "@/components/shell/workflow-page";
export const metadata: Metadata = { title: "Reviews · Medlyn" };

export default function Page() {
  return <WorkflowPage view="reviews" />;
}
