import type { Metadata } from "next";
import { TimelinePage } from "@/components/categories/timeline-page";
export const metadata: Metadata = { title: "Timeline · Medlyn" };

export const dynamic = "force-dynamic";
export default function Page() {
  return <TimelinePage />;
}
