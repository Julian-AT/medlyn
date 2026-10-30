import type { Metadata } from "next";
import { LetterPage } from "@/components/cockpit/letter-page";
export const metadata: Metadata = { title: "GP follow-up letter · Medlyn" };

export default function Page() {
  return <LetterPage />;
}
