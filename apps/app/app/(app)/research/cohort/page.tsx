import type { Metadata } from "next";
import { CohortPage } from "@/components/research/cohort-page";
export const metadata: Metadata = { title: "Research cohort · Medlyn" };

export default function Page() {
  return <CohortPage />;
}
