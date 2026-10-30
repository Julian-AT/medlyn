"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "./cn";
import { LogoMark, Wordmark } from "./icons";
import { DURATION, EASE, gsap, isTouchDevice } from "./motion";
import { APP_URL, GITHUB_URL } from "./site-config";

// Width of the wordmark slot next to the logo mark (58px text + 6px gap).
const WORDMARK_WIDTH = 64;
const wordmarkClassName = "ml-[0.6rem] w-[58px] translate-y-[2px] fill-current";

import { useNav } from "./nav-context";

type NavItemTheme = "white" | "orange";

const ITEM_THEMES: Record<NavItemTheme, CSSProperties> = {
  white: {
    "--nav-item-bg": "var(--color-surface-primary)",
    "--nav-item-text": "var(--color-text-primary)",
    "--nav-item-pressed": "var(--color-stone-alpha-400)",
    "--nav-item-pressed-text": "var(--color-text-primary)",
  } as CSSProperties,
  orange: {
    "--nav-item-bg": "var(--color-orange-500)",
    "--nav-item-text": "var(--color-text-invert-primary)",
    "--nav-item-pressed": "var(--color-orange-600)",
    "--nav-item-pressed-text": "var(--color-text-invert-primary)",
  } as CSSProperties,
};

type ItemHandlers = {
  onMouseEnter: (event: MouseEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) => void;
  onMouseLeave: () => void;
};

function NavItem({
  href,
  theme = "white",
  isHovered,
  external,
  ariaLabel,
  handlers,
  children,
}: {
  href: string;
  theme?: NavItemTheme;
  isHovered: boolean;
  external?: boolean;
  ariaLabel?: string;
  handlers: ItemHandlers;
  children: ReactNode;
}) {
  const { bgTheme } = useNav();
  const idle = !isHovered;

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      target={external ? "_blank" : undefined}
      className="group relative h-10 cursor-pointer outline-hidden hover:no-underline"
      style={ITEM_THEMES[theme]}
      onMouseEnter={handlers.onMouseEnter}
      onMouseLeave={handlers.onMouseLeave}
      onFocus={handlers.onMouseEnter}
      onBlur={handlers.onMouseLeave}
    >
      <span
        className={cn(
          "nav-item-hover absolute top-0 left-0 z-0 h-full w-full rounded-[12px] transition-[background-color] duration-300 ease-out group-active:bg-(color:--nav-item-pressed)",
          idle && "bg-(color:--nav-item-bg)",
          "group-focus-visible:border-2 group-focus-visible:border-blue-500 group-focus-visible:shadow-[0_0_0_3px_rgba(66,181,220,0.30)]",
        )}
      />
      <div
        className={cn(
          "nav-item relative z-1 flex h-full w-full items-center px-[1.2rem] text-nav leading-none",
          isHovered && bgTheme === "light" && "text-text-primary",
          isHovered && bgTheme === "dark" && "text-white",
          idle && "text-(color:--nav-item-text)",
          "transition-colors duration-150 ease-[ease]",
          "group-hover:text-(color:--nav-item-text) group-focus-visible:text-(color:--nav-item-text) group-active:text-(color:--nav-item-pressed-text)",
        )}
      >
        {children}
      </div>
    </Link>
  );
}

type NavLink = {
  label: string;
  href: string;
  theme?: NavItemTheme;
  external?: boolean;
};

function DesktopNav({
  className,
  items,
  withLogo,
}: {
  className: string;
  items: NavLink[];
  withLogo?: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const activeItemRef = useRef<HTMLElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { collapsed } = useNav();

  const movePill = useCallback((x: number, width: number, animate = true) => {
    if (animate) {
      gsap.to(pillRef.current, { x, width, duration: DURATION.fast, ease: EASE.expoOut });
    } else {
      gsap.set(pillRef.current, { x, width });
    }
  }, []);

  const idle = useCallback(() => {
    gsap.killTweensOf(pillRef.current);
    window.setTimeout(() => gsap.set(pillRef.current, { width: 0 }));
  }, []);

  const showPill = useCallback(
    (item: HTMLElement, hovered: boolean) => {
      const pill = pillRef.current;
      if (pill) {
        pill.style.transitionDuration = hovered ? "" : "0s";
        pill.style.backgroundColor = item.style.getPropertyValue("--nav-item-bg");
      }
      movePill(item.offsetLeft, item.getBoundingClientRect().width, hovered);
    },
    [movePill],
  );

  useEffect(() => {
    if (!wordmarkRef.current) return;
    const shrink = collapsed && !isHovered;
    const margin = shrink ? -2.5 : 0;
    gsap.to(markRef.current, {
      marginLeft: margin,
      marginRight: margin,
      autoRound: false,
      duration: DURATION.medium,
      ease: EASE.power4Out,
    });
    gsap.to(wordmarkRef.current, {
      width: shrink ? 0 : WORDMARK_WIDTH,
      autoRound: false,
      duration: DURATION.medium,
      ease: EASE.power4Out,
      ...(shrink ? {} : { clearProps: "width" }),
      onUpdate: () => {
        if (activeItemRef.current) showPill(activeItemRef.current, isHovered);
      },
    });
  }, [collapsed, isHovered, showPill]);

  const handlers: ItemHandlers = {
    onMouseEnter: (event) => {
      if (isTouchDevice()) return;
      activeItemRef.current = event.currentTarget;
      showPill(event.currentTarget, isHovered);
    },
    onMouseLeave: () => {
      if (!isTouchDevice()) activeItemRef.current = null;
    },
  };

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className={cn("group/nav fixed top-4 z-10 hidden w-max p-0 tablet:flex", className)}
      onMouseEnter={() => !isTouchDevice() && setIsHovered(true)}
      onMouseOver={() => !isTouchDevice() && setIsHovered(true)}
      onFocus={() => !isTouchDevice() && setIsHovered(true)}
      onBlur={(event) => {
        if (isTouchDevice() || event.currentTarget.contains(event.relatedTarget)) return;
        idle();
        setIsHovered(false);
      }}
      onMouseLeave={() => {
        if (isTouchDevice()) return;
        idle();
        setIsHovered(false);
      }}
    >
      <div className="nav-frame pointer-events-none absolute top-[-4px] left-[-4px] h-12 w-[calc(100%+8px)] rounded-ctas-wrapper border border-solid border-white/10 bg-stone-alpha-400 backdrop-blur-[13px]" />
      <div
        ref={pillRef}
        aria-hidden="true"
        className="pointer-events-none absolute h-10 w-0 rounded-[12px] bg-white transition-[background-color] duration-150 ease-out group-active/nav:opacity-0"
      />
      {withLogo && (
        <NavItem href="/" ariaLabel="Medlyn home" isHovered={isHovered} handlers={handlers}>
          <span ref={markRef} className="ml-0">
            <LogoMark className="w-[21px] fill-current" />
          </span>
          <span ref={wordmarkRef} className="inline-block w-[64px] overflow-x-clip">
            <Wordmark className={wordmarkClassName} />
          </span>
        </NavItem>
      )}
      {items.map((item) => (
        <NavItem
          key={item.label}
          href={item.href}
          theme={item.theme}
          external={item.external}
          isHovered={isHovered}
          handlers={handlers}
        >
          {item.label}
        </NavItem>
      ))}
    </nav>
  );
}

const MOBILE_LINKS = [
  { label: "Track", href: "#how-it-works" },
  { label: "GitHub", href: GITHUB_URL },
];

function MobileNav() {
  const { collapsed } = useNav();
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const transition = { duration: 0.5, ease: EASE.power4Out };

  useEffect(() => {
    gsap.to(wordmarkRef.current, {
      width: collapsed && !open ? 0 : WORDMARK_WIDTH,
      autoRound: false,
      duration: DURATION.medium,
      ease: EASE.power4Out,
    });
  }, [collapsed, open]);

  function toggle() {
    const nav = navRef.current;
    const panel = panelRef.current;
    if (!nav || !panel) return;
    const fromWidth = nav.offsetWidth;
    gsap.killTweensOf([nav, rowRef.current, panel, contentRef.current]);

    if (!open) {
      setOpen(true);
      // Widen from the pill to the full-width sheet, measured after the open classes apply.
      requestAnimationFrame(() => {
        gsap.fromTo(
          nav,
          { width: fromWidth },
          {
            width: nav.getBoundingClientRect().width,
            autoRound: false,
            clearProps: "width",
            ...transition,
          },
        );
        gsap.to(rowRef.current, { x: 4, y: 4, ...transition });
        gsap.set(panel, { display: "block", pointerEvents: "auto" });
        gsap.fromTo(
          panel,
          { height: 0, opacity: 0 },
          { height: "auto", opacity: 1, ...transition },
        );
        gsap.fromTo(
          contentRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, ...transition },
        );
      });
      return;
    }

    const closedWidth =
      (rowRef.current?.scrollWidth ?? fromWidth) -
      (wordmarkRef.current?.offsetWidth ?? 0) +
      (collapsed ? 0 : WORDMARK_WIDTH);
    gsap.to(rowRef.current, { x: 0, y: 0, ...transition });
    gsap.to(panel, { height: 0, opacity: 0, ...transition });
    gsap.to(nav, {
      width: closedWidth,
      autoRound: false,
      ...transition,
      onComplete: () => {
        gsap.set(panel, { display: "none", pointerEvents: "none" });
        gsap.set(nav, { clearProps: "width" });
        setOpen(false);
      },
    });
  }

  return (
    <nav
      ref={navRef}
      aria-label="Main navigation"
      className={cn(
        "pointer-events-auto fixed top-4 left-1/2 z-10 w-max -translate-x-1/2 tablet:hidden",
        open && "z-50 w-[calc(100vw-32px)]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-1 -left-1 h-full min-h-12 w-[calc(100%+8px)] rounded-ctas-wrapper border border-solid border-white/10 bg-stone-alpha-400 backdrop-blur-[13px]",
          open && "h-[calc(100%+8px)]",
        )}
      />
      <div ref={rowRef} className="relative z-2 flex w-max p-0">
        <Link
          href="/"
          className="group relative z-2 h-10 cursor-pointer outline-hidden"
          aria-label="Medlyn home"
        >
          <span className="nav-item-hover absolute top-0 left-0 z-0 h-full w-full rounded-ctas-button bg-white" />
          <div className="nav-item relative z-1 flex h-full w-full items-center px-[1rem] text-nav leading-none text-text-primary">
            <LogoMark className="w-5 fill-current" />
            <span ref={wordmarkRef} className="inline-block w-[64px] overflow-x-clip">
              <Wordmark className={wordmarkClassName} />
            </span>
          </div>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="group relative h-10 cursor-pointer outline-hidden"
          onClick={toggle}
        >
          <span className="nav-item-hover absolute top-0 left-0 z-0 h-full w-full rounded-ctas-button bg-white" />
          <div className="nav-item relative z-1 flex h-full w-full items-center px-[1rem] text-nav leading-none text-text-primary">
            <span className={cn(open && "opacity-0")}>Menu</span>
          </div>
        </button>
      </div>
      <div
        ref={panelRef}
        className="mobile-nav-extended pointer-events-none relative top-0 left-0 z-1 -mt-10 hidden h-0 w-full overflow-hidden rounded-ctas-button bg-white opacity-0"
      >
        <div className="relative left-1/2 w-[calc(100vw-32px)] -translate-x-1/2 px-pad-xs">
          <div ref={contentRef} className="flex w-full flex-col justify-start pt-32 pb-4">
            {MOBILE_LINKS.map((link) => (
              <a
                key={link.label}
                className="mb-2 block min-h-9 w-full text-left text-heading-lg"
                href={link.href}
                {...(link.href.startsWith("#")
                  ? { onClick: toggle }
                  : { target: "_blank", rel: "noreferrer" })}
              >
                <p>{link.label}</p>
              </a>
            ))}
            <a
              className="group/button relative isolate mt-[2rem] inline-flex h-11.5 cursor-pointer text-body-sm outline-hidden"
              href={APP_URL}
            >
              <span className="z-10 flex w-full items-center justify-center rounded-ctas-button border-2 border-transparent bg-orange-500 px-[1.4rem] text-text-invert-primary transition-colors group-hover/button:bg-surface-tertiary group-active:bg-black-500">
                <p>Get started</p>
              </span>
            </a>
          </div>
        </div>
      </div>
      {open && (
        <button
          type="button"
          onClick={toggle}
          className="absolute top-0 right-1 z-2 block h-10 w-16.5 cursor-pointer justify-center align-middle"
        >
          <p className="text-nav">Close</p>
        </button>
      )}
    </nav>
  );
}

export function SiteNav() {
  const { setCollapsed } = useNav();

  useEffect(() => {
    let last = window.scrollY;
    setCollapsed(last >= 400);
    const onScroll = () => {
      const y = window.scrollY;
      const scrollingUp = y < last;
      last = y;
      if (scrollingUp || y <= 360) setCollapsed(false);
      else if (y >= 400) setCollapsed(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [setCollapsed]);

  return (
    <>
      <DesktopNav
        withLogo
        className="left-1/2 -translate-x-1/2"
        items={[
          { label: "Track", href: "#how-it-works" },
          { label: "GitHub", href: GITHUB_URL, external: true },
        ]}
      />
      <DesktopNav
        className="right-5.5"
        items={[{ label: "Get started", href: APP_URL, theme: "orange" }]}
      />
      <MobileNav />
    </>
  );
}
