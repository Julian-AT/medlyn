import type { ReactNode, SVGProps } from "react";
import { LOGO_MARK_PATH } from "./icons";

// Palette of the product illustrations (stone card, white rows, ink, muted, mono green, pills).
const INK = "#1a1613";
const MUTED = "#a39e95";
const HAIRLINE = "#ece8df";
const CARD = "#f3f0e9";
const ROW = "#fefefe";
const GREEN = "#4a8044";
const GREEN_BG = "#e6efe3";
const BLUE = "#1d779b";
const BLUE_BG = "#e4efef";
const ORANGE = "#cc5800";
const ORANGE_BG = "#ffe8cc";
const GREY = "#666";
const GREY_BG = "#ede8de";

type Font = "body" | "mono";

function Label({
  x,
  y,
  size = 12,
  fill = INK,
  font = "body",
  anchor = "start",
  children,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
  font?: Font;
  anchor?: "start" | "middle" | "end";
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fill={fill}
      textAnchor={anchor}
      className={font === "mono" ? "font-mono" : "font-body"}
      letterSpacing={font === "mono" ? -0.2 : 0}
    >
      {children}
    </text>
  );
}

const PILL_TONES = {
  blue: [BLUE, BLUE_BG],
  green: [GREEN, GREEN_BG],
  orange: [ORANGE, ORANGE_BG],
  grey: [GREY, GREY_BG],
} as const;

// Glyphs for pills, drawn in a 10-unit box.
const PILL_ICONS = {
  check: "M5 1a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM3.4 5.1 4.5 6.2 6.7 3.9",
  link: "M4.2 5.8 5.8 4.2M3.4 4.6 2.6 5.4a1.7 1.7 0 0 0 2.4 2.4l.8-.8M6.6 5.4l.8-.8A1.7 1.7 0 0 0 5 2.2l-.8.8",
  document: "M2.5 1h3.4L7.8 3v6H2.5ZM5.9 1v2h1.9M4 5.3h2.3M4 7h2.3",
  filter: "M1.5 2h7L6 5.3V8L4 9V5.3Z",
  missing: "",
} as const;

/** Mono label pill; `x` is its left edge, or its centre with `center`. */
function Pill({
  x,
  y,
  label,
  tone,
  icon,
  size = 10,
  center = false,
  alignEnd = false,
}: {
  x: number;
  y: number;
  label: string;
  tone: keyof typeof PILL_TONES;
  icon?: keyof typeof PILL_ICONS;
  size?: number;
  center?: boolean;
  alignEnd?: boolean;
}) {
  const [color, background] = PILL_TONES[tone];
  const iconWidth = icon ? size * 1.4 : 0;
  const width = label.length * size * 0.6 + size * 1.6 + iconWidth;
  const height = size * 2;
  const left = center ? x - width / 2 : alignEnd ? x - width : x;
  const iconX = left + size * 0.75;
  const iconY = y + (height - size) / 2;
  return (
    <g>
      <rect x={left} y={y} width={width} height={height} rx={4} fill={background} />
      {icon === "missing" && (
        <circle
          cx={iconX + size / 2}
          cy={iconY + size / 2}
          r={size * 0.4}
          fill="none"
          stroke={color}
          strokeWidth={0.9}
          strokeDasharray="1.6 1.4"
        />
      )}
      {icon && icon !== "missing" && (
        <path
          d={PILL_ICONS[icon]}
          transform={`translate(${iconX} ${iconY}) scale(${size / 10})`}
          fill="none"
          stroke={color}
          strokeWidth={0.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <Label
        x={left + (width + iconWidth) / 2}
        y={y + height / 2 + size * 0.36}
        size={size}
        fill={color}
        font="mono"
        anchor="middle"
      >
        {label}
      </Label>
    </g>
  );
}

// Row glyphs (12-unit box), the thin line icons in front of row labels in the originals.
const ROW_ICONS = {
  calendar: "M2 3h8v7H2ZM2 5.2h8M4 1.8v2M8 1.8v2",
  pill: "M2.4 6.6 6.6 2.4a2 2 0 0 1 3 3L5.4 9.6a2 2 0 0 1-3-3ZM4.5 4.5l3 3",
  alert: "M6 1.8 10.5 10H1.5ZM6 5v2.2M6 8.6v.1",
  heart: "M6 10S1.5 7.3 1.5 4.4A2.2 2.2 0 0 1 6 3.2a2.2 2.2 0 0 1 4.5 1.2C10.5 7.3 6 10 6 10Z",
} as const;

function RowIcon({
  x,
  y,
  icon,
  size = 12,
}: {
  x: number;
  y: number;
  icon: keyof typeof ROW_ICONS;
  size?: number;
}) {
  return (
    <path
      d={ROW_ICONS[icon]}
      transform={`translate(${x} ${y}) scale(${size / 12})`}
      fill="none"
      stroke={INK}
      strokeWidth={0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Flower({
  x,
  y,
  size = 18,
  fill = INK,
}: {
  x: number;
  y: number;
  size?: number;
  fill?: string;
}) {
  return (
    <path
      d={LOGO_MARK_PATH}
      fill={fill}
      fillRule="evenodd"
      transform={`translate(${x} ${y}) scale(${size / 21})`}
    />
  );
}

function Check({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  const k = r / 8;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={GREEN} />
      <path
        d={`M${cx - 3.4 * k} ${cy + 0.2 * k} L${cx - 1 * k} ${cy + 2.6 * k} L${cx + 3.6 * k} ${cy - 2.4 * k}`}
        stroke="#fff"
        strokeWidth={1.6 * k}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Warning({ cx, cy, r = 8 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={ORANGE_BG} />
      <path
        d={`M${cx} ${cy - r * 0.45} V${cy + r * 0.1}`}
        stroke={ORANGE}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy + r * 0.42} r={0.95} fill={ORANGE} />
    </g>
  );
}

function DocumentIcon({
  x,
  y,
  size = 14,
  stroke = INK,
}: {
  x: number;
  y: number;
  size?: number;
  stroke?: string;
}) {
  const k = size / 14;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${k})`}
      fill="none"
      stroke={stroke}
      strokeWidth={1.2}
      strokeLinecap="round"
    >
      <path
        d="M3 1.5h5.5L11.5 4.5V12.5a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z"
        strokeLinejoin="round"
      />
      <path d="M4.5 7h5M4.5 9.5h5M4.5 4.5h2.5" />
    </g>
  );
}

/** Dark rounded avatar square with a white glyph, like the payer logos in the originals. */
function Avatar({
  x,
  y,
  size = 36,
  children,
}: {
  x: number;
  y: number;
  size?: number;
  children: ReactNode;
}) {
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} rx={size * 0.22} fill={INK} />
      {children}
    </g>
  );
}

function Connector({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return <path d={`M${x} ${y1} V${y2}`} stroke="#d8d2c4" strokeWidth={1} strokeDasharray="2 3" />;
}

type IllustrationProps = Omit<SVGProps<SVGSVGElement>, "viewBox">;

function Frame({
  size: [width, height],
  title,
  rounded = 16,
  children,
  ...props
}: IllustrationProps & {
  size: [number, number];
  title: string;
  rounded?: number;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      {...props}
    >
      <title>{title}</title>
      <rect width={width} height={height} rx={rounded} fill={CARD} />
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Infographic cards                                                    */
/* ------------------------------------------------------------------ */

export function SourceLinkedFactCard(props: IllustrationProps) {
  return (
    <Frame
      size={[340, 152]}
      title="Apixaban 5 mg twice daily, documented in the cardiology letter and linked to row 4 of the medication list."
      {...props}
    >
      <Avatar x={16} y={16}>
        <DocumentIcon x={25} y={25} size={18} stroke="#fff" />
      </Avatar>
      <Label x={64} y={39} size={14}>
        Apixaban 5 mg
      </Label>
      <Label x={324} y={39} size={14} fill={GREEN} font="mono" anchor="end">
        2× daily
      </Label>
      <Check cx={25} cy={86} r={9} />
      <Label x={44} y={90} size={13}>
        Documented
      </Label>
      <Label x={130} y={90} size={13} fill={MUTED}>
        Cardiology letter
      </Label>
      <path d="M25 97 V113" stroke={GREEN} strokeWidth={1.4} />
      <Check cx={25} cy={124} r={9} />
      <Label x={44} y={128} size={13}>
        Linked
      </Label>
      <Label x={96} y={128} size={13} fill={MUTED}>
        Medication list, row 4
      </Label>
    </Frame>
  );
}

const BRIEF_ROWS: { label: string; value: string; icon: keyof typeof ROW_ICONS }[] = [
  { label: "Age", value: "58 y", icon: "calendar" },
  { label: "Blood thinner", value: "Apixaban", icon: "pill" },
  { label: "Allergies", value: "Penicillin", icon: "alert" },
];

export function PreOpBriefCard(props: IllustrationProps) {
  return (
    <Frame
      size={[340, 196]}
      title="Preparing a pre-operative brief: age 58, blood thinner apixaban, allergy to penicillin."
      {...props}
    >
      <Flower x={16} y={17} size={18} />
      <Label x={44} y={30} size={12}>
        Preparing pre-op brief…
      </Label>
      {BRIEF_ROWS.map((row, index) => {
        const y = 50 + index * 44;
        return (
          <g key={row.label}>
            <rect x={14} y={y} width={312} height={36} rx={8} fill={ROW} />
            <RowIcon x={24} y={y + 12} icon={row.icon} />
            <Label x={44} y={y + 22} size={11}>
              {row.label}
            </Label>
            <Label x={312} y={y + 22} size={11} fill={GREEN} font="mono" anchor="end">
              {row.value}
            </Label>
          </g>
        );
      })}
    </Frame>
  );
}

export function NotDocumentedCard(props: IllustrationProps) {
  return (
    <Frame
      size={[340, 170]}
      title="Checking kidney function: eGFR is not documented in any of the six documents."
      {...props}
    >
      <Flower x={16} y={17} size={18} />
      <Label x={44} y={30} size={12}>
        Checking kidney function…
      </Label>
      <Pill x={16} y={48} label="Not documented" tone="grey" icon="missing" />
      <Label x={324} y={62} size={12} fill={MUTED} anchor="end">
        6 documents
      </Label>
      <rect x={14} y={82} width={312} height={72} rx={10} fill={ROW} />
      <Label x={30} y={112} size={14}>
        eGFR
      </Label>
      <Label x={310} y={112} size={14} fill={MUTED} font="mono" anchor="end">
        no value
      </Label>
      <Label x={30} y={134} size={11} fill={MUTED}>
        Searched letters and labs, last 3 months
      </Label>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* "How Medlyn works" tiles (534 x 534)                                 */
/* ------------------------------------------------------------------ */

const TILE = 534;

export function RoleTaskTile(props: IllustrationProps) {
  return (
    <Frame
      size={[TILE, TILE]}
      rounded={0}
      title="Role anaesthetist and task pre-op check before breast surgery produce a ready pre-op brief."
      {...props}
    >
      <rect x={127} y={112} width={280} height={24} rx={10} fill="#f8f6f1" />
      <rect x={112} y={120} width={310} height={24} rx={10} fill="#fbfaf7" />
      <rect x={97} y={128} width={340} height={128} rx={12} fill={ROW} />
      <Label x={113} y={156} size={11} fill={MUTED}>
        Role
      </Label>
      <Label x={113} y={178} size={14}>
        Anaesthetist
      </Label>
      <path d="M113 194 H421" stroke={HAIRLINE} strokeDasharray="3 3" />
      <Label x={113} y={216} size={11} fill={MUTED}>
        Task
      </Label>
      <Label x={113} y={238} size={14}>
        Pre-op check before breast surgery
      </Label>
      <Connector x={267} y1={256} y2={318} />
      <Pill x={267} y={277} label="Brief ready" tone="blue" icon="document" center />
      <rect x={97} y={318} width={340} height={124} rx={12} fill={ROW} />
      <Label x={113} y={348} size={14}>
        Pre-op brief
      </Label>
      <Pill x={421} y={334} label="4 facts" tone="green" icon="check" alignEnd />
      <path d="M113 364 H421" stroke={HAIRLINE} />
      <Avatar x={113} y={380}>
        <Flower x={121} y={389} size={20} fill="#fff" />
      </Avatar>
      <Label x={161} y={396} size={13}>
        Breast surgery, left
      </Label>
      <Label x={161} y={413} size={11} fill={MUTED}>
        3 documents · 2 languages
      </Label>
      <Label x={421} y={396} size={13} fill={GREEN} font="mono" anchor="end">
        all sourced
      </Label>
    </Frame>
  );
}

const TASK_FACTS: { label: string; value: string; conflict?: boolean }[] = [
  { label: "Age", value: "58 y" },
  { label: "Blood thinner", value: "Apixaban" },
  { label: "Penicillin allergy", value: "", conflict: true },
  { label: "Heart function", value: "LVEF 55 %" },
];

export function RelevantFactsTile(props: IllustrationProps) {
  return (
    <Frame
      size={[TILE, TILE]}
      rounded={0}
      title="Only the facts an anaesthetist needs: age, blood thinner, a flagged allergy conflict and heart function."
      {...props}
    >
      <rect x={97} y={102} width={340} height={68} rx={12} fill={ROW} />
      <Avatar x={113} y={118}>
        <Flower x={121} y={127} size={20} fill="#fff" />
      </Avatar>
      <Label x={161} y={134} size={13}>
        Anaesthetist · pre-op
      </Label>
      <Label x={161} y={151} size={11} fill={MUTED}>
        Breast surgery, left
      </Label>
      <Label x={421} y={140} size={13} fill={GREEN} font="mono" anchor="end">
        4 of 38
      </Label>
      <Connector x={267} y1={170} y2={230} />
      <Pill x={267} y={190} label="Filtered for task" tone="blue" icon="filter" center />
      {TASK_FACTS.map((fact, index) => {
        const y = 230 + index * 52;
        return (
          <g key={fact.label}>
            <rect x={122} y={y} width={290} height={44} rx={8} fill={ROW} />
            {fact.conflict ? <Warning cx={142} cy={y + 22} /> : <Check cx={142} cy={y + 22} />}
            <Label x={160} y={y + 26} size={12}>
              {fact.label}
            </Label>
            {fact.conflict ? (
              <Pill x={398} y={y + 12} label="Conflict" tone="orange" alignEnd />
            ) : (
              <Label x={398} y={y + 26} size={12} fill={GREEN} font="mono" anchor="end">
                {fact.value}
              </Label>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

export function SourceExcerptTile(props: IllustrationProps) {
  return (
    <Frame
      size={[TILE, TILE]}
      rounded={0}
      title="The fact apixaban 5 mg links to the sentence in the cardiology letter of 12 January 2026, page 1, line 14."
      {...props}
    >
      <rect x={122} y={115} width={290} height={68} rx={12} fill={ROW} />
      <rect x={138} y={131} width={36} height={36} rx={8} fill={BLUE_BG} />
      <DocumentIcon x={147} y={140} size={18} stroke={BLUE} />
      <Label x={186} y={147} size={13}>
        Apixaban 5 mg
      </Label>
      <Label x={186} y={164} size={10.5} fill={MUTED}>
        Medication list · row 4
      </Label>
      <Label x={396} y={146} size={10} fill={MUTED} anchor="end">
        Just now
      </Label>
      <Connector x={267} y1={183} y2={246} />
      <Pill x={267} y={205} label="Source linked" tone="blue" icon="link" center />
      <rect x={97} y={246} width={340} height={172} rx={12} fill={ROW} />
      <Label x={113} y={279} size={13}>
        Cardiology letter
      </Label>
      <rect x={364.5} y={264.5} width={56} height={21} rx={4} fill="none" stroke={HAIRLINE} />
      <DocumentIcon x={372} y={270} size={10} stroke={MUTED} />
      <Label x={386} y={279} size={9.5} fill={MUTED} font="mono">
        Open
      </Label>
      <path d="M113 298 H421" stroke={HAIRLINE} />
      <Label x={113} y={324} size={12} fill={MUTED}>
        Date
      </Label>
      <Label x={421} y={324} size={12} anchor="end">
        12 Jan 2026
      </Label>
      <Label x={113} y={350} size={12} fill={MUTED}>
        Location
      </Label>
      <Label x={421} y={350} size={12} anchor="end">
        p. 1, line 14
      </Label>
      <path d="M113 368 H421" stroke={HAIRLINE} />
      <Label x={113} y={397} size={12} fill={GREEN}>
        “Continues apixaban 5 mg twice daily.”
      </Label>
      <Check cx={413} cy={393} r={7} />
    </Frame>
  );
}
