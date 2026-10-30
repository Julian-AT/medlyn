import type { Metadata } from "next";
import { PatientQuestionsPage } from "@/components/cockpit/patient-questions-page";
export const metadata: Metadata = { title: "Open questions · Medlyn" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const lensKey = typeof values.lensKey === "string" ? values.lensKey : undefined;
  return <PatientQuestionsPage lensKey={lensKey} />;
}
