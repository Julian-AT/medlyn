"use client";

import Image from "next/image";
import { type RefObject, useEffect, useRef } from "react";
import { cn } from "./cn";
import { FeatureOverlay, type OverlayKind } from "./feature-overlays";
import { BREAKPOINTS, gsap, ScrollTrigger, useGSAP } from "./motion";

type Feature = {
  index: number;
  title: string;
  body: string;
  video: string;
  poster: string;
  overlay: OverlayKind;
  textAlign: "left" | "right";
};

const FEATURES: Feature[] = [
  {
    index: 1,
    title: "Medlyn reads the record",
    body: "Tell it your role and your task. It reads every letter, lab report and scan summary, so you don’t have to.",
    video: "/media/paperwork-1.mp4",
    poster: "/images/paperwork-1.jpg",
    overlay: "reading",
    textAlign: "left",
  },
  {
    index: 2,
    title: "Keeps you in the loop",
    body: "When two documents disagree, Medlyn points out the contradiction instead of silently picking one.",
    video: "/media/paperwork-2.mp4",
    poster: "/images/paperwork-2.jpg",
    overlay: "conflict",
    textAlign: "right",
  },
  {
    index: 3,
    title: "And answers your questions",
    body: "One screen with only the facts your task needs, each linked to the sentence or table row it came from.",
    video: "/media/paperwork-3.mp4",
    poster: "/images/paperwork-3.jpg",
    overlay: "question",
    textAlign: "left",
  },
];

const playFromStart = (video: HTMLVideoElement) => {
  if (!video.paused) return;
  video.currentTime = 0;
  video.play().catch(() => {});
};

const stopAndRewind = (video: HTMLVideoElement) => {
  if (video.paused) return;
  video.currentTime = 0;
  video.pause();
};

function FeatureCard({
  feature,
  cardRef,
}: {
  feature: Feature;
  cardRef: RefObject<HTMLDivElement | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !video.getAttribute("src")) {
          video.src = feature.video;
          video.load();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [feature.video]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "absolute inset-x-0 top-[25vw] mx-auto flex w-full max-w-[50rem] flex-col items-center justify-center px-[1.6rem]",
        "tablet:top-[3rem] tablet:right-auto tablet:left-0 tablet:h-full tablet:max-w-none tablet:py-0 desktop:top-0",
      )}
    >
      <div
        className={cn(
          "relative aspect-[362/346] h-full w-full tablet:w-auto",
          "tablet:top-[4rem] tablet:aspect-[975/614] tablet:h-[90%] desktop:top-[2rem] desktop:aspect-[1100/693]",
        )}
      >
        <article
          className={cn(
            feature.textAlign === "left"
              ? "description absolute top-[-2.5rem] max-w-[90%] translate-y-[-100%] tablet:top-[-2rem] tablet:max-w-[50rem] desktop:top-[calc(50%+4.5rem)] desktop:max-w-[25.7rem] desktop:translate-x-[calc(-100%-2.8rem)]"
              : "description absolute top-[-2.4rem] w-auto max-w-[90%] translate-y-[-100%] tablet:top-[-2rem] tablet:max-w-[50rem] desktop:top-[calc(50%+4.5rem)] desktop:right-0 desktop:translate-x-[calc(100%+3rem)] desktopLarge:translate-x-[calc(100%+3.1rem)]",
            "desktop:max-w-[25.7rem]",
          )}
        >
          <div
            className={cn(
              "description-animation relative",
              feature.index !== 1 ? "opacity-0" : "opacity-100",
            )}
          >
            <h3 className="mb-[1.2rem] text-heading-sm text-balance text-text-primary desktop:max-w-full">
              {feature.title}
            </h3>
            <p className="text-body-sm text-text-secondary">{feature.body}</p>
          </div>
        </article>
        <div className="video pointer-events-none relative h-full w-full overflow-hidden rounded-[2.4rem] bg-[#F9F8F5] [container-type:size] tablet:rounded-[5.6rem] desktop:rounded-[6.4rem]">
          <video
            ref={videoRef}
            loop
            playsInline
            muted
            preload="metadata"
            className="relative z-[1] h-full w-full object-cover"
          />
          <Image
            src={feature.poster}
            alt={`Cover image for the video of ${feature.title}`}
            fill
            sizes="(min-width: 1280px) 80vw, 100vw"
            className="h-full w-full object-cover"
          />
          <FeatureOverlay kind={feature.overlay} />
        </div>
      </div>
    </div>
  );
}

/** The video and the overlay covering its baked-in UI zoom together. */
function scaledMedia(card: HTMLElement) {
  return card.querySelectorAll(".video video, .video .video-overlay");
}

function isBelow(breakpoint: number) {
  return window.innerWidth < breakpoint;
}

/** Card takes the front of the stack: description fades in, media settles to full size. */
function activate(card: HTMLElement) {
  const media = card.querySelector<HTMLElement>(".video");
  const video = media?.querySelector("video");
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: () => {
      const progress = tl.progress();
      if (progress > 0.5 && progress < 0.8) {
        card.style.pointerEvents = "auto";
        if (video) playFromStart(video);
      }
      if (progress < 0.5) {
        card.style.pointerEvents = "none";
        if (video) stopAndRewind(video);
      }
    },
  });
  if (!media || !video) return tl;

  const description = card.querySelector(".description-animation");
  const mobile = isBelow(BREAKPOINTS.desktop);
  tl.to(card, { scale: 1, y: 0 }, 0)
    .to(
      description,
      { opacity: 1, duration: () => (isBelow(BREAKPOINTS.desktop) ? 0.5 : 1) },
      mobile ? 0 : 0.1,
    )
    .to(
      description,
      { duration: () => (isBelow(BREAKPOINTS.desktop) ? 2 : 1), scale: 1, y: "0%" },
      mobile ? 0 : 0.1,
    )
    .to(media, { scale: () => 1, y: () => 0, opacity: () => 1, duration: 2 }, 0)
    .to(media, { background: "#F9F8F5", duration: 0.1 }, 0)
    .to(video, { opacity: () => 1 }, 0)
    .fromTo(scaledMedia(card), { scale: 1.05 }, { scale: 1, duration: 2 }, 0);
  return tl;
}

/** Card sits `depth - step` positions behind the front of the stack. */
function stack(card: HTMLElement, depth: number, step: number) {
  const media = card.querySelector<HTMLElement>(".video");
  const video = media?.querySelector("video");
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: () => {
      card.style.pointerEvents = "none";
      if (video) stopAndRewind(video);
    },
  });
  if (!media || !video) return tl;

  const description = card.querySelector(".description-animation");
  const offset = depth - step;
  tl.to(card, { scale: 1, y: 0 }, 0)
    .to(description, { opacity: 0, y: () => `${(90 - step) * offset}%` }, 0)
    .to(media, { background: "#F9F8F5", duration: 0.1 }, 0)
    .to(
      media,
      {
        scale: () => 1 - 0.15 * offset,
        duration: 2,
        y: () => `${(12 - step) * offset}%`,
        opacity: () => 1,
      },
      0,
    )
    .to(video, { opacity: () => (offset <= 0 ? 1 : 0.5 - offset / 5) }, 0);
  return tl;
}

/** Card leaves the stack upward (default power1.out easing, as in the source). */
function exit(card: HTMLElement) {
  const media = card.querySelector<HTMLElement>(".video");
  const video = media?.querySelector("video");
  const tl = gsap.timeline({
    onUpdate: () => {
      if (tl.progress() > 0.3) {
        if (video) stopAndRewind(video);
        card.style.pointerEvents = "none";
      } else {
        card.style.pointerEvents = "auto";
        if (video) playFromStart(video);
      }
    },
  });
  if (!media || !video) return tl;

  const description = card.querySelector(".description-animation");
  if (!description) return tl;
  const width = () => window.innerWidth;
  tl.to(card, { scale: 1, y: 0 }, 0)
    .to(
      description,
      {
        opacity: 0,
        y: () => (width() >= BREAKPOINTS.desktop ? "-60%" : `-${window.innerHeight}px`),
        duration: () =>
          width() < BREAKPOINTS.desktop && width() >= BREAKPOINTS.tablet
            ? 2
            : width() >= BREAKPOINTS.desktop
              ? 0.5
              : 3,
      },
      0,
    )
    .to(media, { background: "transparent", duration: 0.1 }, 0)
    .to(
      media,
      {
        scale: () => 1,
        duration: () =>
          width() >= BREAKPOINTS.desktop ? 3 : width() >= BREAKPOINTS.tablet ? 2 : 3,
        y: () => `${-window.innerHeight}px`,
      },
      0,
    );
  return tl;
}

export function FeaturesCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);
  const thirdRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = [firstRef.current, secondRef.current, thirdRef.current];
    if (!sectionRef.current || cards.some((card) => !card)) return;
    const [first, second, third] = cards as HTMLDivElement[];

    const setup = gsap.timeline();
    cards.forEach((card, index) => {
      if (!card) return;
      setup.set(card.querySelector(".video"), { scale: 0.95, y: "10%", immediateRender: true });
      setup.set(scaledMedia(card), { scale: 1.2, immediateRender: true });
      setup.set(
        card.querySelector(".description-animation"),
        {
          opacity: 0,
          y: () => "50%",
          scale: () => (isBelow(BREAKPOINTS.desktop) && index > 0 ? 0.8 : 1),
          immediateRender: true,
        },
        0,
      );
    });

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "center center",
      end: () =>
        window.innerWidth >= BREAKPOINTS.desktop
          ? `+=${2.2 * window.innerHeight}`
          : window.innerWidth >= BREAKPOINTS.tablet
            ? `+=${3 * window.innerHeight}`
            : `+=${2.5 * window.innerHeight}`,
      pin: true,
      invalidateOnRefresh: true,
    });

    const firstCard = gsap.timeline({ defaults: { ease: "none" } });
    firstCard.add(activate(first), 0).add(exit(first));

    const secondCard = gsap.timeline({ defaults: { ease: "none" } });
    secondCard
      .add(stack(second, 1, 0), 0)
      .add(activate(second))
      .add(exit(second));

    const thirdCard = gsap.timeline({ defaults: { ease: "none" } });
    thirdCard
      .add(stack(third, 2, 0), 0)
      .add(stack(third, 2, 1))
      .add(activate(third));

    gsap
      .timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: () => (isBelow(BREAKPOINTS.tablet) ? "top center-=100" : "top center+=100"),
          end: () => `+=${3 * window.innerHeight}`,
          scrub: 0.25,
          invalidateOnRefresh: true,
        },
      })
      .add(setup, 0)
      .add(firstCard, 0)
      .add(secondCard, 0)
      .add(thirdCard, 0);

    return () => setup.revert();
  });

  const refs = [firstRef, secondRef, thirdRef];

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative h-[100vw] w-screen tablet:mb-[20rem] tablet:h-[75svh] tablet:max-h-[70rem]",
        "desktop:mx-auto desktop:mb-[10rem] desktop:h-[36vw] desktop:max-h-[50rem] desktop:max-w-[2050px]",
        "desktopLarge:h-[40vw] desktopLarge:max-h-[75rem]",
      )}
    >
      {[...FEATURES].reverse().map((feature) => (
        <FeatureCard key={feature.index} feature={feature} cardRef={refs[feature.index - 1]} />
      ))}
    </section>
  );
}
