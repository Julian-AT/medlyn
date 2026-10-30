import type { Metadata } from "next";
import { ResearchPage } from "@/components/shell/research-page";
export const metadata: Metadata = { title: "Evaluation · Medlyn" };

export default function Page() {
  return <ResearchPage view="evaluation" />;
}
