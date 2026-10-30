import type { Metadata } from "next";
import { LetterPage } from "@/components/cockpit/letter-page";
export const metadata: Metadata = { title: "GP follow-up letter · Medlyn" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const lensKey = typeof values.lensKey === "string" ? values.lensKey : undefined;
  return <LetterPage lensKey={lensKey} />;
}
