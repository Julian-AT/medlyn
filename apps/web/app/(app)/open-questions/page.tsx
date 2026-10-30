import type { Metadata } from "next";
import { PatientQuestionsPage } from "@/components/cockpit/patient-questions-page";
export const metadata: Metadata = { title: "Open questions · Medlyn" };

export default function Page() {
  return <PatientQuestionsPage />;
}
