"use client";

import Lenis from "lenis";
import { type ReactNode, useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "./motion";

export function SmoothScroll({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.2 });
    let frame = 0;
    const refresh = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        lenis.resize();
        ScrollTrigger.refresh();
      });
    };

    refresh();
    lenis.on("scroll", ScrollTrigger.update);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    window.addEventListener("load", refresh);
    const main = rootRef.current?.querySelector("main");
    const observer = main ? new ResizeObserver(refresh) : null;
    if (main && observer) observer.observe(main);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("load", refresh);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}
