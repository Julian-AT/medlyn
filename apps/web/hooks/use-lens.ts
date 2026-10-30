"use client";

import { CHIPS } from "@medlyn/engine/lens/needs/profiles";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useActivePatient } from "@/components/patient/active-patient-provider";
import { emptyLens, readLensStream, reduceLens } from "@/lib/lens-state";

type InitialSituation = { text?: string; chipId?: string };

export function useLens(initial: InitialSituation = {}) {
  const { patient } = useActivePatient();
  const [state, dispatch] = useReducer(reduceLens, emptyLens);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [mock, setMock] = useState(false);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const abort = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const session = useRef("");
  const last = useRef({ text: CHIPS[0].text, chipId: CHIPS[0].id as string | undefined });

  const run = useCallback(async (text: string, chipId?: string, noCache = false) => {
    if (!text.trim()) return;
    const number = ++sequence.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 120_000);
    last.current = { text, chipId };
    dispatch({ type: "start" });
    setLoading(true);
    setMock(false);
    setActiveChip(chipId ?? null);
    if (!chipId)
      setRecent((values) => [text, ...values.filter((value) => value !== text)].slice(0, 5));
    try {
      const response = await fetch("/api/lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, chipId, sessionId: session.current, noCache }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body)
        throw new Error("The lens could not be opened. Retry your situation.");
      if (number !== sequence.current) return;
      setMock(response.headers.get("X-Medlyn-Mode") === "mock");
      await readLensStream(response.body, (event) => {
        if (number === sequence.current && !controller.signal.aborted) dispatch(event);
      });
    } catch (error) {
      if (
        number === sequence.current &&
        (!controller.signal.aborted || controller.signal.reason === "timeout")
      ) {
        dispatch({
          type: "error",
          message:
            controller.signal.reason === "timeout"
              ? "The evidence check took too long. Retry your situation."
              : error instanceof Error && error.message.startsWith("The lens")
                ? error.message
                : "The lens response could not be read. Retry your situation.",
          retryable: true,
        });
      }
    } finally {
      clearTimeout(timeout);
      if (number === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = sessionStorage.getItem(`medlyn-session:${patient.id}`) ?? crypto.randomUUID();
    sessionStorage.setItem(`medlyn-session:${patient.id}`, id);
    session.current = id;
    setSessionId(id);
    const chip = CHIPS.find((item) => item.id === initial.chipId) ?? CHIPS[0];
    if (initial.text?.trim()) void run(initial.text);
    else void run(chip.text, chip.id);
    return () => {
      sequence.current++;
      abort.current?.abort();
    };
  }, [patient.id, initial.chipId, initial.text, run]);

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
