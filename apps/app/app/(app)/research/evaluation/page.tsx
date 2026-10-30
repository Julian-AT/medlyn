import type { Metadata } from "next";
import { EvaluationPage } from "@/components/research/evaluation-page";
export const metadata: Metadata = { title: "Evaluation · Medlyn" };

export default function Page() {
  return <EvaluationPage />;
}
