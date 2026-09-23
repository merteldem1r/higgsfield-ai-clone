import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Stroke({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

// The logo gradient as SVG stops. Stop colors come from theme vars via classes (presentation attributes can't read var()).
function BrandGradient({ id, x1, x2, y }: { id: string; x1: number; x2: number; y: number }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={x1} y1={y} x2={x2} y2={y}>
      <stop offset="0" className="[stop-color:var(--color-brand-sky)]" />
      <stop offset="0.38" className="[stop-color:var(--color-brand-violet)]" />
      <stop offset="0.68" className="[stop-color:var(--color-brand-pink)]" />
      <stop offset="1" className="[stop-color:var(--color-brand-peach)]" />
    </linearGradient>
  );
}

const SPARKLE_PATH =
  "M12 2c.4 4.9 2.6 7.6 7.8 8.6.5.1.5.7 0 .8-5.2 1-7.4 3.7-7.8 8.6 0 .5-.7.5-.8 0-.4-4.9-2.6-7.6-7.8-8.6-.5-.1-.5-.7 0-.8 5.2-1 7.4-3.7 7.8-8.6 0-.5.7-.5.8 0Z";

export function SparkleIcon({ gradient = false, ...props }: IconProps & { gradient?: boolean }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" fill={gradient ? `url(#${id})` : "currentColor"} aria-hidden {...props}>
      {gradient && (
        <defs>
          <BrandGradient id={id} x1={3} x2={21} y={12} />
        </defs>
      )}
      <path d={SPARKLE_PATH} />
    </svg>
  );
}

// Vector redraw of src/app/logo.png (four corner brackets around a four-point star), crisp at 28px.
export function LogoMark(props: IconProps) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <defs>
        <BrandGradient id={id} x1={6} x2={26} y={16} />
      </defs>
      <g stroke={`url(#${id})`} strokeWidth={2.4} strokeLinecap="round">
        <path d="M7 13V10.5A4 4 0 0 1 11 6.5H13.5" />
        <path d="M18.5 6.5H21A4 4 0 0 1 25 10.5V13" />
        <path d="M25 19V21.5A4 4 0 0 1 21 25.5H18.5" />
        <path d="M13.5 25.5H11A4 4 0 0 1 7 21.5V19" />
      </g>
      <path
        d="M16 8C16.9 12.4 19.2 15.1 23.6 16C19.2 16.9 16.9 19.6 16 24C15.1 19.6 12.8 16.9 8.4 16C12.8 15.1 15.1 12.4 16 8Z"
        fill={`url(#${id})`}
      />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 5v14M5 12h14" />
    </Stroke>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M5 12h14" />
    </Stroke>
  );
}

export function XIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Stroke>
  );
}

export function ChevronUpIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="m6 15 6-6 6 6" />
    </Stroke>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Stroke>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M2 4.5A2.5 2.5 0 0 1 4.5 2h6.3c.7 0 1.3.3 1.8.7l8.7 8.7a2.5 2.5 0 0 1 0 3.5l-6.3 6.3a2.5 2.5 0 0 1-3.5 0L2.7 12.6c-.4-.5-.7-1.1-.7-1.8V4.5ZM7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}

export function DiamondIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M6 3h12l4 6-10 12L2 9l4-6Z" />
      <path d="M2 9h20" />
    </Stroke>
  );
}

export function AspectIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
    </Stroke>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </Stroke>
  );
}

export function ReuseIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </Stroke>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </Stroke>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

export function GiftIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </Stroke>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="m3 6.5 9 6.5 9-6.5" />
    </Stroke>
  );
}

export function GoogleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...props}>
      <path className="fill-google-blue" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8Z" />
      <path className="fill-google-green" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
      <path className="fill-google-yellow" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path className="fill-google-red" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.8 3.6-4.9 6.7-4.9Z" />
    </svg>
  );
}
