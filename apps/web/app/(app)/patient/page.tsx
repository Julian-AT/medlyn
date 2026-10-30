import type { Metadata } from "next";
import { OverviewPage } from "@/components/categories/overview-page";
export const metadata: Metadata = { title: "Patient overview · Medlyn" };

export const dynamic = "force-dynamic";
export default function Page() {
  return <OverviewPage />;
}
