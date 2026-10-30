"use client";

import { useRef } from "react";
import { cn } from "./cn";
import { FlowerMap } from "./flower-map";
import { BREAKPOINTS, gsap, ScrollTrigger, useGSAP } from "./motion";

// Scroll distances in viewport heights for the heading/map rise.
const RISE_LENGTH = 3;
// How long the settled map stays pinned before the page scrolls on.
const HOLD_LENGTH = 0.25;
// The rise starts when the section top is at viewport center, half a viewport
// before the section pins.
const PIN_LENGTH = RISE_LENGTH - 0.5 + HOLD_LENGTH;

export function Locations() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    const section = sectionRef.current;
    if (!section) return;
    const map = section.querySelector<HTMLElement>(".map-interaction");

    const media = gsap.matchMedia();
    media.add(`(min-width: ${BREAKPOINTS.tablet}px)`, () => {
      const pin = ScrollTrigger.create({
        id: "locations",
        trigger: section,
        start: "top top",
        end: () => `+=${PIN_LENGTH * window.innerHeight}px`,
        pin: true,
        invalidateOnRefresh: true,
      });

      const scene = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top center",
          end: () => `+=${RISE_LENGTH * window.innerHeight}px`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      scene
        .set(headingRef.current, {
          scale: 1,
          y: () => 0.2 * window.innerHeight,
          immediateRender: true,
        })
        .set(map, { y: () => window.innerHeight / 2, immediateRender: true })
        .fromTo(
          headingRef.current,
          {
            scale: 1,
            y: () => 0.2 * window.innerHeight,
            immediateRender: true,
          },
          { duration: 6, scale: 0.7, y: 0 },
        )
        .fromTo(
          map,
          { y: () => 0.7 * window.innerHeight, immediateRender: true },
          { duration: 6, y: 0 },
          0,
        );

      let frame = 0;
      const onResize = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => ScrollTrigger.refresh());
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(frame);
        gsap.killTweensOf([headingRef.current, map]);
        map?.setAttribute("style", "");
        headingRef.current?.setAttribute("style", "");
        scene.revert();
        pin.kill();
      };
    });

    return () => media.revert();
  });

  return (
    <div>
      <section
        id="locations"
        ref={sectionRef}
        className={cn(
          "relative z-[1] flex w-screen flex-col items-center justify-center bg-background-primary pt-[12rem] text-center",
          "mb-[15rem] tablet:mb-[10rem] tablet:grid tablet:h-svh tablet:grid-rows-[auto_minmax(0,1fr)] tablet:justify-items-center tablet:justify-normal tablet:pt-[8rem]",
        )}
      >
        <h2
          ref={headingRef}
          aria-label="Built in Austria"
          className="mb-[4.6rem] w-[80%] text-heading-lg tablet:mb-0"
        >
          Built in Austria
          <br />
          for every clinician
        </h2>
        <span className="relative mb-[4.6rem] flex w-full items-center justify-center tablet:mb-0">
          <FlowerMap />
        </span>
      </section>
    </div>
  );
}
