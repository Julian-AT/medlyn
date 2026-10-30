import type { Metadata } from "next";
import { ResearchPage } from "@/components/shell/research-page";
export const metadata: Metadata = { title: "Research cohort · Medlyn" };

export default function Page() {
  return <ResearchPage view="cohort" />;
}
