"use client";

import Image from "next/image";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { cn } from "./cn";
import { HeroActions } from "./hero-actions";
import { ClosedBookIcon, CompletedIcon, SendIcon, TerminalIcon } from "./icons";
import { DURATION, EASE, gsap, ScrollTrigger, useGSAP } from "./motion";
import { useNav } from "./nav-context";

const TASKS: { label: string; Icon: ComponentType }[] = [
  { label: "Anaesthetist · pre-op check before breast surgery", Icon: TerminalIcon },
  { label: "Linked 14 facts to their source documents", Icon: CompletedIcon },
  { label: "Flagged conflicting allergy entries", Icon: SendIcon },
  { label: "Marked eGFR as not documented", Icon: ClosedBookIcon },
  { label: "Translated a German discharge letter", Icon: SendIcon },
];

const TASK_INTERVAL_MS = 2500;

function TaskRotator() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>("[data-task-item]", rootRef.current);
      if (items.length <= 1) return;

      let index = 0;
      let previous: HTMLElement | null = null;
      gsap.set(items, { yPercent: 100, autoAlpha: 0 });

      const advance = () => {
        const next = items[index];
        gsap.fromTo(
          next,
          { yPercent: 100 },
          { yPercent: 0, autoAlpha: 1, duration: DURATION.slow, ease: EASE.expoOut },
        );
        if (previous) {
          gsap.fromTo(
            previous,
            { yPercent: 0 },
            { yPercent: -100, duration: DURATION.slow, ease: EASE.expoOut },
          );
        }
        previous = next;
        index = (index + 1) % items.length;
      };

      advance();
      const timer = window.setInterval(advance, TASK_INTERVAL_MS);
      return () => window.clearInterval(timer);
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="relative h-[3rem] w-full overflow-hidden" aria-live="polite">
      {TASKS.map(({ label, Icon }) => (
        <div
          key={label}
          data-task-item
          className="absolute inset-0 flex h-[3rem] items-center justify-center whitespace-nowrap opacity-0"
        >
          <p className="flex items-center justify-center gap-2 text-body-md text-text-white opacity-70">
            <span className="mr-[0.3rem] inline">
              <Icon />
            </span>
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const { setBgTheme } = useNav();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const enter = () => {
        videoRef.current?.play().catch(() => {});
        setBgTheme("dark");
      };
      const leave = () => {
        videoRef.current?.pause();
        setBgTheme("light");
      };
      const visibility = ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        invalidateOnRefresh: true,
        onEnter: enter,
        onEnterBack: enter,
        onLeave: leave,
      });
      const scroll = visibility.scroll();
      if (scroll >= visibility.start && scroll < visibility.end) enter();
      else leave();

      ScrollTrigger.create({
        start: 100,
        invalidateOnRefresh: true,
        onEnter: () => setIsZoomed(true),
        onEnterBack: () => setIsZoomed(true),
        onLeaveBack: () => setIsZoomed(false),
        onLeave: () => setIsZoomed(false),
      });
    });
    return () => ctx.revert();
  }, [setBgTheme]);

  return (
    <section
      ref={sectionRef}
      aria-label="Hero section"
      className="relative flex h-svh w-screen items-center justify-center"
    >
      <div
        className={cn(
          "absolute flex h-full w-full items-center justify-center bg-surface-primary",
          "transition-[clip-path] duration-1000 ease-out-quint",
          isZoomed ? "clip-inset-collapsed" : "clip-inset-full",
        )}
      >
        <Image
          src="/images/hero-cover.jpg"
          alt="Hero video cover image"
          aria-hidden
          fill
          preload
          sizes="100vw"
          className="-z-10 inline-block h-full w-full transform-gpu overflow-hidden object-cover [contain:layout_paint] [will-change:clip-path]"
        />
        <video
          ref={videoRef}
          src="/media/hero.mp4"
          poster="/images/hero-cover.jpg"
          preload="metadata"
          autoPlay
          muted
          loop
          playsInline
          className="relative z-[1] inline-block h-full w-full transform-gpu overflow-hidden object-cover [contain:layout_paint] [will-change:clip-path]"
        />
      </div>
      <div className="relative flex flex-col items-center justify-center">
        <h1 className="mb-[4rem] text-center text-heading-xl text-text-white">
          You’re a doctor.
          <br />
          <span className="italic">Not a machine.</span>
        </h1>
        <p className="mb-[0.8rem] text-center text-body-md text-text-white">
          Let Medlyn read the chart
        </p>
        <TaskRotator />
      </div>
      <div
        className={cn(
          "absolute bottom-[1.6rem] transition-transform duration-500 ease-out",
          isZoomed ? "-translate-y-[50px]" : "translate-y-0",
        )}
      >
        <HeroActions />
      </div>
    </section>
  );
}
