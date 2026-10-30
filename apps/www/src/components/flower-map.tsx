"use client";

import { useEffect, useRef } from "react";
import { cn } from "./cn";
import { MAP_POINTS } from "./map-points";
import { gsap, isTouchDevice, ScrollTrigger } from "./motion";

const VIEWBOX = { width: 1311, height: 821 };
const PADDING = 16; // the dot layers are inset 1.6rem inside the map box
const STAGE_OFFSET = 3;
const HOVER_RADIUS = 1.5 * PADDING;
// Share of markers that briefly bloom while the map fills in.
const INTRO_FLOWER_THRESHOLD = 0.94;
const DOT_COLOR = "#2a221d";

const SHEET = {
  src: "/lottie/spritesheet.png",
  frameSize: 188,
  columns: 10,
  frames: { intro: { to: 26 }, loop: { to: 65 }, end: { from: 66, to: 83 } },
};

class Flower {
  frame = 0;
  alpha = 0;
  state: "intro" | "end" | null = null;
  readonly scale: number;
  private intro?: gsap.core.Timeline;
  private outro?: gsap.core.Timeline;
  private loop?: gsap.core.Tween;

  constructor() {
    // Narrow size range so neighbouring flowers read as one family.
    const size = 0.36 + 0.12 * Math.random();
    this.scale = size * (window.innerWidth / 1776);
  }

  playOver() {
    if (this.state === "intro") return;
    this.state = "intro";
    this.killAll();
    this.intro = gsap
      .timeline()
      .set(this, { alpha: 1 })
      .fromTo(
        this,
        { frame: 0 },
        {
          frame: SHEET.frames.intro.to - 5,
          duration: 0.65,
          onComplete: () => {
            this.loop = gsap.to(this, {
              frame: SHEET.frames.loop.to,
              duration: 0.75,
              repeat: -1,
              ease: "none",
            });
          },
        },
      );
  }

  async playOut(delay = 0) {
    if (this.state === "end") return;
    this.state = "end";
    await this.intro;
    this.killAll();
    this.outro = gsap
      .timeline()
      .fromTo(
        this,
        { frame: SHEET.frames.end.from },
        { frame: SHEET.frames.end.to, duration: 0.45, delay },
      )
      .set(this, { alpha: 0 });
  }

  dispose() {
    this.killAll();
    this.intro?.kill();
    this.outro?.kill();
  }

  private killAll() {
    gsap.killTweensOf(this);
    this.loop?.kill();
  }
}

class Dot {
  x = 0;
  y = 0;
  radius = 0;
  appear = 0;
  dotScale = 1;
  flower: Flower | null = null;
  private hovered = false;

  intro(withFlower: boolean) {
    const tl = gsap.timeline().fromTo(this, { appear: 0 }, { appear: 1, duration: 0.3 });
    if (withFlower) {
      tl.call(() => {
        this.showFlower();
        this.hideFlower();
      });
    }
    return tl;
  }

  showFlower() {
    if (this.hovered) return;
    this.hovered = true;
    this.flower ??= new Flower();
    gsap.killTweensOf(this, "dotScale");
    gsap.to(this, { dotScale: 0, duration: 0.6 });
    this.flower.playOver();
  }

  hideFlower() {
    if (!this.hovered) return;
    this.hovered = false;
    if (!this.flower) return;
    gsap.killTweensOf(this, "dotScale");
    gsap.to(this, { dotScale: 1, duration: 0.6, delay: 0.3 });
    void this.flower.playOut(0.3);
  }

  dispose() {
    gsap.killTweensOf(this);
    this.flower?.dispose();
    this.flower = null;
  }
}

export function FlowerMap({ className }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!box || !canvas || !context) return;

    const dots = MAP_POINTS.map(() => new Dot());
    const sheet = new window.Image();
    sheet.src = SHEET.src;
    let introduced = false;
    let introTimeline: gsap.core.Timeline | null = null;
    let size = { width: 0, height: 0, ratio: 0 };

    // Re-measures only when the box or pixel ratio changed: resizing a canvas clears it.
    const layout = () => {
      const width = box.clientWidth;
      const height = box.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      if (width === size.width && height === size.height && ratio === size.ratio) return;
      size = { width, height, ratio };
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const innerWidth = width - 2 * PADDING;
      const innerHeight = height - 2 * PADDING;
      const scale = Math.min(innerWidth / VIEWBOX.width, innerHeight / VIEWBOX.height);
      const offsetX = (innerWidth - VIEWBOX.width * scale) / 2;
      const offsetY = (innerHeight - VIEWBOX.height * scale) / 2;

      MAP_POINTS.forEach(([x, y, width, height], index) => {
        const dot = dots[index];
        const left = offsetX + x * scale;
        const top = offsetY + y * scale;
        // Centre each marker on its grid dot so the two layers line up.
        dot.x = left + (width * scale) / 2 + PADDING;
        dot.y = top + (height * scale) / 2 + PADDING;
        dot.radius = (width * scale) / 2;
      });
    };

    const draw = () => {
      context.clearRect(0, 0, size.width, size.height);
      context.save();
      context.translate(STAGE_OFFSET, STAGE_OFFSET);
      context.fillStyle = DOT_COLOR;
      for (const dot of dots) {
        const radius = dot.radius * dot.appear * dot.dotScale;
        if (radius > 0.05) {
          context.beginPath();
          context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
          context.fill();
        }
        const flower = dot.flower;
        if (flower && flower.alpha > 0 && sheet.complete && sheet.naturalWidth > 0) {
          const frame = Math.min(SHEET.frames.end.to, Math.max(0, Math.floor(flower.frame)));
          const sx = (frame % SHEET.columns) * SHEET.frameSize;
          const sy = Math.floor(frame / SHEET.columns) * SHEET.frameSize;
          const size = SHEET.frameSize * flower.scale * dot.appear;
          context.globalAlpha = flower.alpha;
          context.drawImage(
            sheet,
            sx,
            sy,
            SHEET.frameSize,
            SHEET.frameSize,
            dot.x + 2 - size / 2,
            dot.y - 3 - size / 2,
            size,
            size,
          );
          context.globalAlpha = 1;
        }
      }
      context.restore();
    };

    let visible = false;
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    visibility.observe(box);
    const tick = () => {
      if (visible) draw();
    };
    gsap.ticker.add(tick);

    const intro = () => {
      if (introduced) return;
      introduced = true;
      layout();
      introTimeline = gsap.timeline({ delay: 0.1 });
      dots.forEach((dot, index) => {
        introTimeline?.add(dot.intro(Math.random() > INTRO_FLOWER_THRESHOLD), 0.002 * index);
      });
    };

    const trigger = ScrollTrigger.create({
      trigger: box,
      start: "top bottom-=400",
      invalidateOnRefresh: true,
      onEnter: intro,
    });

    const onPointerMove = (event: MouseEvent) => {
      if (isTouchDevice() || !introduced) return;
      const rect = box.getBoundingClientRect();
      const x = event.clientX - rect.left - STAGE_OFFSET;
      const y = event.clientY - rect.top - STAGE_OFFSET;
      // Only the nearest marker blooms; the clusters are too dense to bloom every marker in range.
      let nearest: Dot | null = null;
      let nearestDistance = HOVER_RADIUS;
      for (const dot of dots) {
        const distance = Math.hypot(dot.x - x, dot.y - y);
        if (distance < nearestDistance) {
          nearest = dot;
          nearestDistance = distance;
        }
      }
      for (const dot of dots) {
        if (dot === nearest) dot.showFlower();
        else dot.hideFlower();
      }
    };
    window.addEventListener("mousemove", onPointerMove);

    const resizeObserver = new ResizeObserver(layout);
    resizeObserver.observe(box);
    layout();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("mousemove", onPointerMove);
      gsap.ticker.remove(tick);
      visibility.disconnect();
      trigger.kill();
      introTimeline?.kill();
      dots.forEach((dot) => {
        dot.dispose();
      });
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={cn(
        "map-interaction aspect-[1311/821] w-full tablet:relative tablet:max-w-[1023px] desktop:mt-[-4rem] desktop:w-[80%] desktop:max-w-[1350px] desktopLarge:w-[70%]",
        className,
      )}
    >
      {/* biome-ignore lint/performance/noImgElement: Preserve the static SVG dot field's exact sizing and rendering. */}
      <img
        src="/svg/austria-dots.svg"
        alt=""
        aria-hidden="true"
        className="absolute top-[1.6rem] left-[1.6rem] h-[calc(100%-3.2rem)] w-[calc(100%-3.2rem)]"
      />
      <div className="flowers pointer-events-none absolute top-0 left-0 h-full w-full">
        <canvas ref={canvasRef} className="h-full w-full touch-none" />
      </div>
    </div>
  );
}
