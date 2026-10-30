"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Vote = "up" | "down" | null;

export function useMessageFeedback(messageId: string) {
  const key = `medlyn:chat-feedback:v1:${messageId}`;
  const [vote, setVote] = useState<Vote>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      setVote(saved === "up" || saved === "down" ? saved : null);
    } catch (error) {
      console.warn("chat_feedback_unavailable", error instanceof Error ? error.name : "Unknown");
    }
  }, [key]);
  function choose(value: Exclude<Vote, null>) {
    const next = vote === value ? null : value;
    try {
      if (next) localStorage.setItem(key, next);
      else localStorage.removeItem(key);
      setVote(next);
    } catch (error) {
      console.warn("chat_feedback_unavailable", error instanceof Error ? error.name : "Unknown");
      toast.error("Couldn't save feedback in this browser.");
    }
  }
  return { vote, choose };
}
