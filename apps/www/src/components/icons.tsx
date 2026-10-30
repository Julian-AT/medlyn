import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/** Flower mark, drawn in a 21x19 box. */
export const LOGO_MARK_PATH =
  "M8.09799 5.59379C8.64975 3.29132 12.8728 -1.49502 14.995 0.457653C15.5096 0.931674 15.9811 1.61058 15.6672 3.64769C15.4504 5.05664 14.4039 6.75749 11.9045 8.97505C21.6239 1.1462 23.554 15.5546 12.7202 13.1919C17.7293 18.0144 5.84566 21.493 7.21458 14.7894C-0.648439 20.658 -3.02221 6.30954 4.85119 10.0397C4.54951 9.85596 3.65955 9.5126 2.89214 8.18028C-1.80677 0.0254168 8.50698 -2.26497 8.09799 5.59379ZM8.10995 8.40536C8.25927 9.60208 7.42345 10.6975 6.22958 10.8703L6.08716 10.8913L6.22859 10.9182C7.41249 11.1457 8.19757 12.2789 7.99342 13.4668L7.96852 13.6082L8.03724 13.4827C8.61972 12.4264 9.94029 12.0313 11.0082 12.5924L11.1357 12.6591L11.0371 12.5545C10.2125 11.6745 10.2462 10.2971 11.1098 9.45609L11.2133 9.3555L11.0829 9.41625C9.99044 9.92824 8.68914 9.47227 8.15576 8.39142L8.09202 8.26194L8.10995 8.40536Z";

export function LogoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 21 19" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Medlyn logo</title>
      <path fillRule="evenodd" clipRule="evenodd" d={LOGO_MARK_PATH} />
    </svg>
  );
}

export function TerminalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>Terminal icon</title>
      <path
        d="M4.25 4.75L6 6.5L4.25 8.25M7.75 8.25H9.75M3.75 17.25H14.25C15.9069 17.25 17.25 15.9069 17.25 14.25V3.75C17.25 2.09315 15.9069 0.75 14.25 0.75H3.75C2.09315 0.75 0.75 2.09315 0.75 3.75V14.25C0.75 15.9069 2.09315 17.25 3.75 17.25Z"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>Send icon</title>
      <path
        d="M7.5006 9.79167L1.63879 4.58117C1.06608 4.0721 1.42617 3.125 2.19243 3.125H17.7327C18.3723 3.125 18.7734 3.81561 18.4566 4.37115L10.8347 17.7365C10.4593 18.3949 9.47119 18.2509 9.29925 17.5128L7.5006 9.79167ZM7.5006 9.79167L18.8222 3.33333"
        stroke="white"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CompletedIcon() {
  return (
    <svg width="18" height="15" viewBox="0 0 18 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>Completed icon</title>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.1965 0.14738C6.52934 0.393931 6.5993 0.863624 6.35274 1.19647L3.01941 5.69647C2.78046 6.01905 2.32987 6.09628 1.99714 5.87168L0.330471 4.74668C-0.0128492 4.51494 -0.103302 4.04876 0.128439 3.70544C0.36018 3.36212 0.82636 3.27167 1.16968 3.50341L2.24136 4.22679L5.14741 0.303627C5.39396 -0.0292173 5.86365 -0.0991716 6.1965 0.14738ZM8.00008 3.25005C8.00008 2.83583 8.33586 2.50005 8.75008 2.50005H17.2501C17.6643 2.50005 18.0001 2.83583 18.0001 3.25005C18.0001 3.66426 17.6643 4.00005 17.2501 4.00005H8.75008C8.33586 4.00005 8.00008 3.66426 8.00008 3.25005ZM6.1965 9.14738C6.52934 9.39393 6.5993 9.86362 6.35274 10.1965L3.01941 14.6965C2.78046 15.0191 2.32987 15.0963 1.99714 14.8717L0.330471 13.7467C-0.0128492 13.5149 -0.103302 13.0488 0.128439 12.7054C0.36018 12.3621 0.82636 12.2717 1.16968 12.5034L2.24136 13.2268L5.14741 9.30363C5.39396 8.97078 5.86365 8.90083 6.1965 9.14738ZM8.00008 11.75C8.00008 11.3358 8.33586 11 8.75008 11H17.2501C17.6643 11 18.0001 11.3358 18.0001 11.75C18.0001 12.1643 17.6643 12.5 17.2501 12.5H8.75008C8.33586 12.5 8.00008 12.1643 8.00008 11.75Z"
        fill="white"
      />
    </svg>
  );
}

export function ClosedBookIcon() {
  return (
    <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
      <title>Closed book icon</title>
      <path
        d="M5.25 0.75H3.75C2.09315 0.75 0.75 2.09315 0.75 3.75V15.25C0.75 16.9069 2.09315 18.25 3.75 18.25H5.25M5.25 0.75H13.25C14.9069 0.75 16.25 2.09315 16.25 3.75V15.25C16.25 16.9069 14.9069 18.25 13.25 18.25H5.25M5.25 0.75V18.25M9.25 5.25H12.25M9.25 9.25H12.25"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 42 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Chevron Icon"
      {...props}
    >
      <path
        d="M13.9424 19.759C16.5148 18.269 18.6686 16.1521 20.2028 13.6058L20.3714 13.3255C20.5042 13.1051 20.7433 12.9706 21.0007 12.9706C21.258 12.9706 21.4964 13.1052 21.6293 13.3255L21.7979 13.6058C23.332 16.1521 25.486 18.269 28.0583 19.759L27.3225 21.0294C24.7831 19.5585 22.6221 17.5224 21.0007 15.0855C19.3792 17.5224 17.2184 19.5585 14.6789 21.0294L13.9424 19.759Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Chevron Icon"
      {...props}
    >
      <path
        d="M7.69345 4.09943C8.9391 6.25004 10.7089 8.05064 12.8376 9.33325L13.0719 9.47421C13.2562 9.58525 13.3687 9.78513 13.3687 10.0003C13.3686 10.2154 13.2561 10.4147 13.0719 10.5258L12.8376 10.6667C10.7089 11.9493 8.93909 13.75 7.69345 15.9006L6.63135 15.2854C7.86108 13.1624 9.56324 11.3559 11.6006 10.0003C9.56325 8.64472 7.86108 6.83823 6.63135 4.71517L7.69345 4.09943Z"
        fill="currentColor"
      />
    </svg>
  );
}

// Ink box of "Medlyn" set in ABC Marist at 100px (baseline at y=0).
const WORDMARK_VIEWBOX = "4 -70 318 92";

/** Medlyn wordmark set in the heading font; colour follows `fill`. */
export function Wordmark({ className, ...props }: IconProps) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <title>Medlyn</title>
      <text x="0" y="0" fontSize="100" className="font-heading">
        Medlyn
      </text>
    </svg>
  );
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="currentColor"
        d="M12 .5C5.65.5.5 5.65.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.97c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.65 18.35.5 12 .5Z"
      />
    </svg>
  );
}
