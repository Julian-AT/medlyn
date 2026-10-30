"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { useWorkspace } from "@/components/shell/workspace-provider";
import { chatDrafts } from "@/lib/chat-drafts";

const Investigation = z.object({ question: z.object({ title: z.string().min(1) }) });

export function InvestigationBridge() {
  const router = useRouter();
  const { patient } = useActivePatient();
  const { reviews } = useWorkspace();
  const lensKey = reviews.screen?.lensKey;
  useEffect(() => {
    const investigate = (event: Event) => {
      const parsed = Investigation.safeParse((event as CustomEvent).detail);
      if (!parsed.success) return;
      const id = crypto.randomUUID();
      chatDrafts.save(patient.id, id, {
        text: `Investigate: ${parsed.data.question.title}`,
        lensKey,
      });
      router.push(`/chat/${id}`);
    };
    window.addEventListener("medlyn:investigate", investigate);
    return () => window.removeEventListener("medlyn:investigate", investigate);
  }, [lensKey, patient.id, router]);
  return null;
}
