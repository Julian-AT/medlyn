"use client";

import { useEffect, useRef, useState } from "react";
import type { InvestigationQuestion } from "../investigation-questions";
import { type InvestigationItem, runInvestigations } from "../investigation-runner";

type QueueState = { sourceId: string; items: InvestigationItem[]; running: boolean };

export function useInvestigationQueue(run: (text: string) => Promise<boolean>, stop: () => void) {
  const [state, setState] = useState<QueueState | null>(null);
  const generation = useRef(0);
  const running = useRef(false);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );

  return {
    state,
    async start(sourceId: string, questions: InvestigationQuestion[]) {
      if (running.current || !questions.length) return;
      running.current = true;
      const current = ++generation.current;
      const active = () => generation.current === current;
      setState((previous) => ({
        sourceId,
        items:
          previous?.sourceId === sourceId
            ? previous.items.map((item) =>
                item.status === "checked" ? item : { ...item, status: "pending" },
              )
            : questions.map((item) => ({ ...item, status: "pending" })),
        running: true,
      }));
      try {
        await runInvestigations(questions, run, active, (id, status) => {
          setState(
            (value) =>
              value && {
                ...value,
                items: value.items.map((item) => (item.id === id ? { ...item, status } : item)),
              },
          );
        });
      } catch (error) {
        console.warn("investigation_queue_failed", error instanceof Error ? error.name : "Unknown");
        if (active())
          setState(
            (value) =>
              value && {
                ...value,
                items: value.items.map((item) =>
                  item.status === "active" ? { ...item, status: "failed" } : item,
                ),
              },
          );
      } finally {
        if (active()) {
          running.current = false;
          setState((value) => value && { ...value, running: false });
        }
      }
    },
    stop() {
      generation.current++;
      running.current = false;
      stop();
      setState(
        (value) =>
          value && {
            ...value,
            running: false,
            items: value.items.map((item) =>
              item.status === "active" ? { ...item, status: "stopped" } : item,
            ),
          },
      );
    },
  };
}

export type InvestigationQueueState = QueueState;
