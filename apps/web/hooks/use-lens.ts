"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { LensEvent } from "@medlyn/engine/contracts";
import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { emptyLens, NdjsonBuffer, reduceLens } from "@/lib/lens-state";

export function useLens() {
  const [state, dispatch] = useReducer(reduceLens, emptyLens);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(CHIPS[0].id);
  const [recent, setRecent] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const last = useRef({
    text: CHIPS[0].text,
    chipId: CHIPS[0].id as string | undefined,
  });

  const run = useCallback(
    async (text: string, chipId?: string, noCache = false, session?: string) => {
      if (!text.trim()) return;
      const number = ++sequence.current;
      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;
      last.current = { text, chipId };
      setLoading(true);
      setActiveChip(chipId ?? null);
      if (!chipId)
        setRecent((values) => [text, ...values.filter((value) => value !== text)].slice(0, 5));
      try {
        const response = await fetch("/api/lens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            chipId,
            sessionId: session ?? sessionId,
            noCache,
          }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body)
          throw new Error("The lens could not be opened. Retry your situation.");
        if (number !== sequence.current) return;
        setMock(response.headers.get("X-Medlyn-Mode") === "mock");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const buffer = new NdjsonBuffer();
        while (true) {
          const { done, value } = await reader.read();
          const events = buffer.push(decoder.decode(value, { stream: !done }), done);
          if (number !== sequence.current) {
            await reader.cancel();
            return;
          }
          for (const event of events) dispatch(LensEvent.parse(event));
          if (done) break;
        }
      } catch (error) {
        if (!controller.signal.aborted && number === sequence.current) {
          dispatch({
            type: "error",
            message: error instanceof Error ? error.message : "Lens unavailable. Retry.",
            retryable: true,
          });
        }
      } finally {
        if (number === sequence.current) setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    const id = sessionStorage.getItem("medlyn-session") ?? crypto.randomUUID();
    sessionStorage.setItem("medlyn-session", id);
    setSessionId(id);
    void run(CHIPS[0].text, CHIPS[0].id, false, id);
    return () => {
      abort.current?.abort();
    };
    // The initial request belongs to this browser tab, independently of subsequent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    state,
    sessionId,
    loading,
    mock,
    activeChip,
    recent,
    run,
    retry: () => run(last.current.text, last.current.chipId, true),
  };
}
