"use client";

import { useEffect, useRef } from "react";

export function useTranscriptScroll() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = root.current?.querySelector<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (!viewport) return;
    let follow = true;
    let frame = 0;
    const onScroll = () => {
      follow = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
    };
    const observer = new MutationObserver(() => {
      if (!follow) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { viewport.scrollTop = viewport.scrollHeight; });
    });
    observer.observe(viewport, { childList: true, subtree: true, characterData: true });
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      viewport.removeEventListener("scroll", onScroll);
    };
  }, []);
  return root;
}
