"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

export const BREAKPOINTS = {
  mobile: 394,
  tablet: 1024,
  desktop: 1280,
  desktopLarge: 1440,
} as const;

export const DURATION = { fast: 0.3, medium: 0.6, slow: 1 } as const;

export const EASE = {
  power4Out: "power4.out",
  expoInOut: "expo.inOut",
  expoOut: "expo.out",
} as const;

export function isTouchDevice() {
  if (typeof window === "undefined") return false;
  return (
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(any-pointer: coarse)").matches ||
    "ontouchstart" in window
  );
}
