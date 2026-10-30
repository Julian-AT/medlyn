"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";
import { useWorkspace } from "@/components/shell/workspace-provider";

const Investigation = z.object({ question: z.object({ title: z.string().min(1) }) });

export function InvestigationBridge() {
  const router = useRouter();
  const { reviews } = useWorkspace();
  const lensKey = reviews.screen?.lensKey;
  useEffect(() => {
    const investigate = (event: Event) => {
      const parsed = Investigation.safeParse((event as CustomEvent).detail);
      if (!parsed.success) return;
      const id = crypto.randomUUID();
      sessionStorage.setItem(
        `medlyn:chat-draft:${id}`,
        JSON.stringify({
          text: `Investigate: ${parsed.data.question.title}`,
          lensKey,
        }),
      );
      router.push(`/chat/${id}`);
    };
    window.addEventListener("medlyn:investigate", investigate);
    return () => window.removeEventListener("medlyn:investigate", investigate);
  }, [lensKey, router]);
  return null;
}
