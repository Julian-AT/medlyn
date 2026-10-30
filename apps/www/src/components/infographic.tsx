"use client";

import Image from "next/image";
import { type RefObject, useRef, useState } from "react";
import { cn } from "./cn";
import { NotDocumentedCard, PreOpBriefCard, SourceLinkedFactCard } from "./illustrations";
import { BREAKPOINTS, DURATION, EASE, gsap, ScrollTrigger, useGSAP } from "./motion";

type Responsive = { desktop: number; mobile: number };

type Orbit = {
  angle: number;
  fromAngle: Responsive;
  toAngle: Responsive;
  offsetX: Responsive;
  offsetY: Responsive;
};

// One entry per orbiting item, in the order of `items` below.
const ORBITS: Orbit[] = [
  {
    angle: -74,
    fromAngle: { desktop: -174, mobile: -154 },
    toAngle: { desktop: -74, mobile: -84 },
    offsetX: { desktop: 0, mobile: 0 },
    offsetY: { desktop: 0, mobile: 0 },
  },
  {
    angle: -74,
    fromAngle: { desktop: -120, mobile: -120 },
    toAngle: { desktop: -74, mobile: -74 },
    offsetX: { desktop: -80, mobile: -80 },
    offsetY: { desktop: 10, mobile: 10 },
  },
  {
    angle: 35,
    fromAngle: { desktop: -125, mobile: -25 },
    toAngle: { desktop: 35, mobile: 35 },
    offsetX: { desktop: -25, mobile: -25 },
    offsetY: { desktop: -60, mobile: -20 },
  },
  {
    angle: 105,
    fromAngle: { desktop: 5, mobile: 110 },
    toAngle: { desktop: 105, mobile: 130 },
    offsetX: { desktop: -50, mobile: -50 },
    offsetY: { desktop: 40, mobile: -20 },
  },
  {
    angle: 195,
    fromAngle: { desktop: 95, mobile: 180 },
    toAngle: { desktop: 195, mobile: 205 },
    offsetX: { desktop: 0, mobile: 25 },
    offsetY: { desktop: 0, mobile: -60 },
  },
  {
    angle: 105,
    fromAngle: { desktop: 30, mobile: 100 },
    toAngle: { desktop: 105, mobile: 120 },
    offsetX: { desktop: 50, mobile: 0 },
    offsetY: { desktop: -100, mobile: -40 },
  },
];

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const pick = (value: Responsive) =>
  window.innerWidth >= BREAKPOINTS.tablet ? value.desktop : value.mobile;

export function Infographic() {
  const sectionRef = useRef<HTMLElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const copyOneRef = useRef<HTMLHeadingElement>(null);
  const copyTwoRef = useRef<HTMLHeadingElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const topLeftRef = useRef<HTMLDivElement>(null);
  const sourceFactRef = useRef<HTMLDivElement>(null);
  const topRightRef = useRef<HTMLDivElement>(null);
  const bottomRightRef = useRef<HTMLDivElement>(null);
  const weeklyRef = useRef<HTMLDivElement>(null);
  const claimRef = useRef<HTMLDivElement>(null);
  const [percentage, setPercentage] = useState(100);

  useGSAP((context) => {
    const section = sectionRef.current;
    if (!section) return;

    const items: RefObject<HTMLDivElement | null>[] = [
      topLeftRef,
      sourceFactRef,
      topRightRef,
      bottomRightRef,
      weeklyRef,
      claimRef,
    ];
    const orbits = ORBITS.map((orbit) => ({ ...orbit }));
    const state = {
      value: 0,
      radiusX: 0.3 * window.innerWidth,
      radiusY: 0.3 * window.innerHeight,
      animateScale: true,
    };
    let cardsTimeline = gsap.timeline({ paused: true });
    let counted = false;

    const render = () => {
      items.forEach((ref, index) => {
        const element = ref.current;
        if (!element) return;
        const image = element.querySelector("img");
        const scale = Math.min(1, 2 * cardsTimeline.progress());
        if (image && !element.dataset.graphic && state.animateScale) {
          image.style.transform = `scale(${Math.max(1, 2 - 1.5 * cardsTimeline.progress())})`;
        }
        const orbit = orbits[index];
        const x =
          Math.cos(toRadians(orbit.angle - 60)) * state.radiusX -
          element.offsetWidth / 2 +
          pick(orbit.offsetX);
        const y =
          Math.sin(toRadians(orbit.angle - 60)) * state.radiusY -
          element.offsetHeight / 2 +
          pick(orbit.offsetY);
        element.style.opacity = "1";
        element.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
      });
    };

    const animateCards = (isMobile: boolean) => {
      cardsTimeline = gsap.timeline({
        paused: true,
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: () => (isMobile ? `+=${2 * window.innerHeight}` : `+=${3.5 * window.innerHeight}`),
          onUpdate: render,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      cardsTimeline.set(state, {
        radiusX: () => 0.43 * window.innerWidth,
        radiusY: () => 0.39 * window.innerHeight,
      });
      orbits.forEach((orbit) => {
        cardsTimeline.fromTo(
          orbit,
          { angle: pick(orbit.fromAngle) },
          { angle: pick(orbit.toAngle) },
          0,
        );
      });
      return cardsTimeline;
    };

    const animateText = (isMobile: boolean) =>
      gsap
        .timeline({
          paused: true,
          scrollTrigger: {
            trigger: section,
            start: "top center",
            end: () => (isMobile ? `+=${1.5 * window.innerHeight}` : `+=${3 * window.innerHeight}`),
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        .fromTo(
          percentRef.current,
          { autoAlpha: 0, y: "+=30px" },
          { autoAlpha: 1, y: "0px", duration: 3 * DURATION.slow, ease: EASE.expoOut },
          1,
        )
        .fromTo(
          copyOneRef.current,
          { autoAlpha: 0, y: "+=30px" },
          { autoAlpha: 1, y: "0px", duration: 3 * DURATION.slow, ease: EASE.expoOut },
          1.1,
        )
        .to({}, { duration: 4 })
        .to(percentRef.current, { autoAlpha: 0, y: "-60%", duration: DURATION.slow })
        .to(copyOneRef.current, { autoAlpha: 0, y: "-40%", duration: DURATION.slow }, "<")
        .fromTo(
          copyTwoRef.current,
          { autoAlpha: 0, y: "20%" },
          { autoAlpha: 1, y: "-40%", duration: 1.5 },
        )
        .to({}, { duration: 1 });

    if (layerRef.current) layerRef.current.style.opacity = "1";

    let countUp: gsap.core.Timeline | undefined;
    ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: () => `+=${3 * window.innerHeight}`,
      scrub: true,
      invalidateOnRefresh: true,
      onEnter: () => {
        if (counted) return;
        context.add(() => {
          countUp = gsap.timeline().fromTo(
            state,
            { value: 0 },
            {
              value: 100,
              duration: 3 * DURATION.slow,
              ease: EASE.expoInOut,
              delay: 0.5,
              onComplete: () => {
                counted = true;
              },
              onUpdate: () => setPercentage(Math.round(state.value)),
            },
          );
        });
      },
    });

    const media = gsap.matchMedia();
    media.add(`(max-width: ${BREAKPOINTS.desktop - 1}px)`, () => {
      const cards = animateCards(true);
      const text = animateText(true);
      return () => {
        cards.revert();
        text.revert();
      };
    });
    media.add(`(min-width: ${BREAKPOINTS.desktop}px)`, () => {
      const cards = animateCards(false);
      const text = animateText(false);
      return () => {
        cards.revert();
        text.revert();
      };
    });

    ScrollTrigger.create({
      trigger: section,
      start: "center center",
      end: () =>
        window.innerWidth >= BREAKPOINTS.desktop
          ? `+=${2.2 * window.innerHeight}`
          : `+=${1.2 * window.innerHeight}`,
      pin: true,
      invalidateOnRefresh: true,
    });

    const onResize = () => {
      if (window.innerWidth >= BREAKPOINTS.tablet) {
        state.animateScale = true;
        state.radiusX = 0.43 * window.innerWidth;
        state.radiusY = 0.43 * window.innerHeight;
        requestAnimationFrame(() => requestAnimationFrame(render));
      } else {
        state.animateScale = false;
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      countUp?.revert();
      media.revert();
    };
  });

  return (
    <section
      id="infographic"
      ref={sectionRef}
      className="relative flex min-h-[100svh] w-full min-w-[394px] items-center justify-center"
    >
      <div className="relative h-[15rem] w-full">
        <div className="absolute top-1/2 left-1/2 flex w-full translate-x-[-50%] translate-y-[-50%] flex-col items-center justify-center text-center">
          <span ref={percentRef} className="text-heading-xl">
            {percentage}%
          </span>
          <div className="grid w-full place-items-center">
            <h2
              ref={copyOneRef}
              className="col-start-1 row-start-1 w-full text-center text-heading-lg"
            >
              of facts link
              <br />
              to their source
            </h2>
            <h2
              ref={copyTwoRef}
              className="col-start-1 row-start-1 w-full text-center text-heading-lg opacity-0"
            >
              If it isn’t documented,
              <br />
              Medlyn says so
            </h2>
          </div>
        </div>
      </div>
      <div
        ref={layerRef}
        className="pointer-events-none absolute top-0 left-0 h-svh w-full opacity-0"
      >
        <div ref={topLeftRef} className="absolute top-1/2 left-1/2">
          <span className="relative inline-block h-[12.5rem] w-[11.3rem] overflow-hidden rounded-[1.2rem] tablet:h-[20.8rem] tablet:w-[17rem] desktop:h-[26.1rem] desktop:w-[23.6rem] desktop:rounded-[1.6rem]">
            <Image
              src="/images/infographic-top-left.jpg"
              alt="Tall yellow wildflowers with thin green stems stand against a softly blurred, sunlit background, conveying a serene and natural atmosphere."
              fill
              sizes="(min-width: 1280px) 480px, 340px"
              className="object-cover"
            />
          </span>
        </div>
        <div ref={sourceFactRef} data-graphic="true" className="absolute top-1/2 left-1/2">
          <div
            className={cn(
              "absolute top-[-7rem] left-[7rem] h-[7.86rem] w-[17.6rem] max-w-none rounded-[1.2rem] desktop:rounded-[1.6rem]",
              "tablet:h-[15.2rem] tablet:w-[22.5rem] desktop:w-[34rem]",
            )}
          >
            <SourceLinkedFactCard className="absolute inset-0 h-full w-full" />
          </div>
        </div>
        <div ref={topRightRef} className="absolute top-1/2 left-1/2">
          <picture
            data-graphic="true"
            className="relative block h-[12.3rem] w-[12.1rem] overflow-hidden rounded-[1.2rem] tablet:h-[19.1rem] tablet:w-[19.1rem] desktop:h-[27.7rem] desktop:w-[27.3rem] desktop:rounded-[1.6rem]"
          >
            <Image
              src="/images/infographic-top-right.jpg"
              alt="A person in a navy outfit is seen from behind through a glass window. The setting appears calm, with soft light and minimalistic decor in blue tones."
              fill
              sizes="(min-width: 1280px) 560px, 390px"
              className="h-full w-full object-cover"
            />
          </picture>
        </div>
        <div ref={bottomRightRef} className="absolute top-1/2 left-1/2">
          <picture className="relative block aspect-square h-[11.6rem] w-[12.1rem] overflow-hidden rounded-[1.2rem] tablet:h-[18.2rem] tablet:w-[18.2rem] desktop:h-[22.8rem] desktop:w-[23.8rem] desktop:rounded-[1.6rem]">
            <Image
              src="/images/infographic-bottom-right.jpg"
              alt="Hands typing on a sleek, white keyboard in a modern office setting. A smartwatch adorns one wrist, conveying a sense of productivity and focus."
              fill
              sizes="(min-width: 1280px) 480px, 370px"
              className="h-full w-full object-cover"
            />
          </picture>
        </div>
        <div
          ref={weeklyRef}
          data-graphic="true"
          className="absolute top-1/2 left-1/2 h-[10rem] w-[17.6rem] max-w-none rounded-[1.2rem] tablet:h-[14rem] tablet:w-[26.1rem] desktop:h-[17rem] desktop:w-[34rem] desktop:rounded-[1.6rem]"
        >
          <PreOpBriefCard className="absolute inset-0 h-full w-full" />
        </div>
        <div ref={claimRef} data-graphic="true" className="absolute top-1/2 left-1/2">
          <div className="relative h-[8.74rem] w-[17.6rem] max-w-none tablet:h-[12.6rem] tablet:w-[22.5rem] desktop:h-[19.6rem] desktop:w-[34rem]">
            <NotDocumentedCard className="absolute inset-0 h-full w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
