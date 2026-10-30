"use client";

import { useEffect, useState } from "react";
import type { GalleryState } from "../gallery-tools";

const states: GalleryState[] = ["input-streaming", "input-available", "output-available"];

export function useGalleryStreaming(enabled: boolean) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(
      () => setStep((value) => (value + 1) % states.length),
      1800,
    );
    return () => window.clearInterval(interval);
  }, [enabled]);
  return enabled ? states[step] : "output-available";
}
