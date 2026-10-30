import type { Metadata } from "next";
import { ReviewsPage } from "@/components/cockpit/reviews-page";
export const metadata: Metadata = { title: "Reviews · Medlyn" };

export default function Page() {
  return <ReviewsPage />;
}
