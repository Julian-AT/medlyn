"use client";
import { useEffect, useRef, useState } from "react";
import { Letter } from "@medlyn/engine/contracts";

export function useLetter(sessionId: string, lensKey: string | null, reviewVersion: number) {
  const [letter, setLetter] = useState<Letter | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const previousVersion = useRef(reviewVersion);
  const requestId = useRef(0);
  useEffect(() => {
    requestId.current++;
    setLetter(null);
    setError(null);
    setStale(false);
    setBusy(false);
  }, [lensKey]);
  useEffect(() => {
    if (previousVersion.current !== reviewVersion && letter) setStale(true);
    previousVersion.current = reviewVersion;
  }, [reviewVersion, letter]);

  async function refresh() {
    if (!letter) return;
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lens/letter/${encodeURIComponent(letter.id)}?sessionId=${encodeURIComponent(sessionId)}`,
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The saved draft could not be refreshed.");
      if (id !== requestId.current) return;
      setLetter(Letter.parse(body));
      setStale(false);
    } catch (cause) {
      if (id === requestId.current)
        setError(cause instanceof Error ? cause.message : "Draft refresh unavailable.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  async function generate() {
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, lensKey }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The letter could not be generated. Retry.");
      if (id === requestId.current) {
        setLetter(Letter.parse(body));
        setStale(false);
      }
    } catch (cause) {
      if (id === requestId.current)
        setError(cause instanceof Error ? cause.message : "Letter unavailable.");
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  async function save(claimId: string, text: string): Promise<boolean> {
    if (!letter) return false;
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/letter/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          letterId: letter.id,
          claimId,
          text,
          author: "Clinician",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The edit could not be checked. Retry.");
      if (id !== requestId.current) return false;
      setLetter(Letter.parse(body));
      return true;
    } catch (cause) {
      if (id === requestId.current)
        setError(cause instanceof Error ? cause.message : "Edit unavailable.");
      return false;
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }
  return { letter, busy, error, stale, refresh, generate, save };
}
