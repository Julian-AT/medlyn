"use client";

import { type DotLottie, DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "./motion";

export function HowItWorksIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const [player, setPlayer] = useState<DotLottie | null>(null);

  useGSAP(() => {
    if (!player || !sectionRef.current) return;
    let onLoad: (() => void) | null = null;
    const play = () => {
      player.setFrame(0);
      player.play();
    };
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
      once: true,
      onEnter: () => {
        if (player.isLoaded) {
          play();
          return;
        }
        onLoad = () => {
          play();
          if (onLoad) player.removeEventListener("load", onLoad);
          onLoad = null;
        };
        player.addEventListener("load", onLoad);
      },
    });
    return () => {
      if (onLoad) player.removeEventListener("load", onLoad);
      trigger.kill();
    };
  }, [player]);

  return (
    <section
      ref={sectionRef}
      className="mb-[8rem] flex w-full flex-col items-center justify-center tablet:mb-[6rem]"
    >
      <span className="inline-block w-[32rem]">
        <DotLottieReact
          src="/lottie/flower.lottie"
          animationId="appear"
          loop={false}
          autoplay={false}
          renderConfig={{ autoResize: true }}
          dotLottieRefCallback={setPlayer}
          className="h-[16rem] w-[32rem]"
        />
      </span>
      <h2 className="text-center text-heading-lg text-text-primary">
        AI that prepares the
        <br />
        doctor’s brief
      </h2>
    </section>
  );
}
