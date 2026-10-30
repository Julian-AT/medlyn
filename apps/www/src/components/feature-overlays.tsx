import type { ReactNode } from "react";
import { cn } from "./cn";
import { LogoMark } from "./icons";

/*
 * The carousel videos carry a baked-in UI card from the original site. These overlays sit
 * exactly on top of it: the frame mirrors the video's `object-cover` box (1920x1210) inside
 * the `.video` size container, and each card covers the largest extent the baked card
 * reaches during its loop (measured per video, plus a small margin).
 * Sizes inside use `cqw` of the frame, i.e. they scale with the video like the original UI
 * (1cqw ≈ 8px at desktop width, so 1.6cqw ≈ the original 13px header).
 */

const VIDEO_RATIO = "158.68cqh"; // 100cqh * 1920 / 1210
const VIDEO_INVERSE_RATIO = "63.02cqw"; // 100cqw * 1210 / 1920

export type OverlayKind = "reading" | "conflict" | "question";

const BOUNDS: Record<OverlayKind, { left: string; top: string; width: string; height: string }> = {
  reading: { left: "23.4%", top: "30.8%", width: "53.2%", height: "38.4%" },
  conflict: { left: "23.4%", top: "25.8%", width: "53.4%", height: "48.4%" },
  question: { left: "23.1%", top: "27.1%", width: "53.7%", height: "52.4%" },
};

const MUTED = "text-[#a39e95]";

/* Small line icons drawn on a 12-unit grid, like the row icons in the original UI. */
function LineIcon({ d, className }: { d: string; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className={cn("size-[1.3cqw] shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  document: "M3 1.5h4l2.5 2.5v6.5H3ZM7 1.5V4h2.5M4.5 6.5h3M4.5 8.5h3",
  lab: "M4.5 1.5h3M5 1.5v3.2L2.2 9.6a.6.6 0 0 0 .5.9h6.6a.6.6 0 0 0 .5-.9L7 4.7V1.5M3.6 7.5h4.8",
  pill: "M2.4 6.6 6.6 2.4a2 2 0 0 1 3 3L5.4 9.6a2 2 0 0 1-3-3ZM4.5 4.5l3 3",
  heart: "M6 10S1.5 7.3 1.5 4.4A2.2 2.2 0 0 1 6 3.2a2.2 2.2 0 0 1 4.5 1.2C10.5 7.3 6 10 6 10Z",
  calendar: "M2 3h8v7H2ZM2 5.2h8M4 1.8v2M8 1.8v2",
  plus: "M6 2.5v7M2.5 6h7",
};

function Header({ title, detail, aside }: { title: string; detail?: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-[1.1cqw]">
      <LogoMark className="mt-[0.05cqw] w-[2.1cqw] shrink-0 fill-[#1a1613]" />
      <div className="grow text-[1.6cqw] leading-[1.3] text-[#1a1613]">
        <p>{title}</p>
        {detail && <p>{detail}</p>}
      </div>
      {aside}
    </div>
  );
}

/* Status marks in the column left of each row. */
const Done = () => (
  <span className="flex size-[1.6cqw] items-center justify-center rounded-full bg-[#4a8044]">
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className="size-[70%]"
      fill="none"
      stroke="#fff"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.6 5.2 4.3 6.9 7.5 3.4" />
    </svg>
  </span>
);

const Waiting = () => (
  <span className="block size-[1.5cqw] rounded-full border border-dashed border-[#cfcac0]" />
);

const Spinner = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="size-[1.6cqw] animate-spin text-[#a39e95] [animation-duration:1.6s]"
  >
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
      <path
        key={angle}
        d="M8 1.6v2.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.25 + (angle / 45) * 0.1}
        transform={`rotate(${angle} 8 8)`}
      />
    ))}
  </svg>
);

const Flag = () => (
  <span className="flex size-[1.6cqw] items-center justify-center rounded-full bg-[#ffe8cc] font-mono text-[1.05cqw] leading-none text-[#cc5800]">
    !
  </span>
);

function Row({
  status,
  icon,
  label,
  value,
  tone = "muted",
  className,
}: {
  status: ReactNode;
  icon?: keyof typeof ICONS;
  label: ReactNode;
  value: ReactNode;
  tone?: "muted" | "green" | "orange";
  className?: string;
}) {
  return (
    <div className="flex items-center gap-[1.2cqw]">
      <span className="flex w-[1.6cqw] shrink-0 justify-center">{status}</span>
      <div
        className={cn(
          "flex h-[4.2cqw] grow items-center gap-[0.9cqw] rounded-[0.9cqw] bg-white px-[1.3cqw] text-[1.3cqw] leading-none text-[#4d4843]",
          className,
        )}
      >
        {icon && <LineIcon d={ICONS[icon]} className="text-[#4d4843]" />}
        <span className="grow truncate">{label}</span>
        <span
          className={cn(
            "shrink-0",
            tone === "muted" && MUTED,
            tone === "green" && "font-mono text-[1.25cqw] text-[#4a8044]",
            tone === "orange" && "font-mono text-[1.25cqw] text-[#cc5800]",
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function ReadingCard() {
  return (
    <>
      <Header title="Medlyn reading the record…" />
      <div className="mt-auto flex flex-col gap-[0.8cqw]">
        <Row
          status={<Done />}
          icon="document"
          label="Discharge letter, 03/2026"
          value="12 facts"
          tone="green"
        />
        <Row
          status={<Spinner />}
          icon="lab"
          label="Lab report, 11 values"
          value="Reading values…"
        />
        <Row status={<Waiting />} icon="pill" label="Medication list" value="Up next" />
      </div>
    </>
  );
}

function SourceRow({ label, value, quote }: { label: string; value: string; quote: string }) {
  return (
    <div className="flex items-start gap-[1.2cqw]">
      <span className="flex w-[1.6cqw] shrink-0 justify-center pt-[1.3cqw]">
        <Flag />
      </span>
      <div className="grow rounded-[0.9cqw] bg-white px-[1.3cqw] py-[1.4cqw] leading-none">
        <div className="flex items-center gap-[0.9cqw] text-[1.3cqw] text-[#4d4843]">
          <LineIcon d={ICONS.document} />
          <span className="grow">{label}</span>
          <span className="font-mono text-[1.25cqw] text-[#cc5800]">{value}</span>
        </div>
        <p className={cn("mt-[0.9cqw] pl-[2.2cqw] text-[1.2cqw]", MUTED)}>{quote}</p>
      </div>
    </div>
  );
}

function ConflictCard() {
  return (
    <>
      <Header title="Two documents disagree" detail="Penicillin allergy" />
      <div className="mt-[2.4cqw] flex flex-col gap-[0.8cqw]">
        <SourceRow
          label="GP letter, 02/2026"
          value="Allergic"
          quote="“Known penicillin allergy (rash, 2019).”"
        />
        <SourceRow
          label="Admission note, 03/2026"
          value="None known"
          quote="“Allergies: none known.”"
        />
      </div>
      <div
        className={cn("mt-auto flex items-center gap-[1.2cqw] text-[1.3cqw] leading-none", MUTED)}
      >
        <span className="flex w-[1.6cqw] shrink-0 justify-center">
          <Spinner />
        </span>
        Showing both sources to the clinician
      </div>
    </>
  );
}

function QuestionCard() {
  return (
    <>
      <div className="flex h-[4.4cqw] shrink-0 items-center gap-[1cqw] rounded-full bg-white pr-[0.7cqw] pl-[1.3cqw] text-[1.3cqw] leading-none text-[#1a1613] shadow-[0_0_0_1px_#ece8df]">
        <span className="flex size-[1.9cqw] items-center justify-center rounded-full border border-[#a39e95] text-[#a39e95]">
          <LineIcon d={ICONS.plus} className="size-[1.1cqw]" />
        </span>
        <span className="grow truncate">Anaesthetist: pre-op check before breast surgery</span>
        <span className="flex size-[2.9cqw] items-center justify-center rounded-full bg-[#1a1613] text-white">
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className="size-[1.2cqw]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 10V2M2.8 5.2 6 2l3.2 3.2" />
          </svg>
        </span>
      </div>
      <div className="mt-auto">
        <Header
          title="4 facts for your task"
          aside={<span className={cn("font-mono text-[1.25cqw] leading-[1.7]", MUTED)}>of 38</span>}
        />
        <div className="mt-[1.4cqw] flex flex-col gap-[0.6cqw]">
          <Row
            status={<Done />}
            icon="calendar"
            label="Age"
            value="58 y"
            tone="green"
            className="h-[3.7cqw]"
          />
          <Row
            status={<Done />}
            icon="pill"
            label="Blood thinner"
            value="Apixaban 5 mg"
            tone="green"
            className="h-[3.7cqw]"
          />
          <Row
            status={<Flag />}
            icon="document"
            label="Penicillin allergy"
            value="Conflict"
            tone="orange"
            className="h-[3.7cqw]"
          />
          <Row
            status={<Done />}
            icon="heart"
            label="Heart function"
            value="LVEF 55 %"
            tone="green"
            className="h-[3.7cqw]"
          />
        </div>
      </div>
    </>
  );
}

const CARDS: Record<OverlayKind, () => ReactNode> = {
  reading: ReadingCard,
  conflict: ConflictCard,
  question: QuestionCard,
};

export function FeatureOverlay({ kind }: { kind: OverlayKind }) {
  const Card = CARDS[kind];
  return (
    <div
      aria-hidden="true"
      className="absolute z-[2] [container-type:size]"
      style={{
        width: `max(100cqw, ${VIDEO_RATIO})`,
        height: `max(100cqh, ${VIDEO_INVERSE_RATIO})`,
        left: `calc(50cqw - max(100cqw, ${VIDEO_RATIO}) / 2)`,
        top: `calc(50cqh - max(100cqh, ${VIDEO_INVERSE_RATIO}) / 2)`,
      }}
    >
      <div className="video-overlay absolute inset-0">
        <div
          className="absolute flex flex-col overflow-hidden rounded-[2cqw] bg-[#fbf9f7] p-[2.2cqw] font-body"
          style={BOUNDS[kind]}
        >
          <Card />
        </div>
      </div>
    </div>
  );
}
