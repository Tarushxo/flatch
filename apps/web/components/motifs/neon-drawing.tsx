import type { ReactNode } from "react";

const TUBE = {
  viewBox: "0 0 60 60",
  fill: "none",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/**
 * A single-line neon sketch for empty and error states. It is drawn twice,
 * like the logo: a dark unlit tube underneath and a lit, flickering tube on top.
 *
 * Children are SVG shapes on a 60 x 60 grid. Set the colour with `--glow` and
 * the size with `className` (for example `size-28`).
 */
export function NeonDrawing({
  label,
  children,
  className = "",
}: {
  /** What the drawing shows, for screen readers. */
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span role="img" aria-label={label} className={`relative inline-block ${className}`}>
      <svg
        {...TUBE}
        aria-hidden="true"
        className="size-full stroke-[color-mix(in_oklab,var(--glow)_30%,var(--surface-2))]"
      >
        {children}
      </svg>
      {/* The glow is a filter on the whole SVG element, so it is not cut off at the drawing's edge. */}
      <svg
        {...TUBE}
        aria-hidden="true"
        className="absolute inset-0 size-full animate-neon stroke-[color-mix(in_oklab,var(--glow)_22%,white)] [filter:drop-shadow(0_0_2px_var(--glow))_drop-shadow(0_0_9px_var(--glow))]"
      >
        {children}
      </svg>
    </span>
  );
}

/** A diner coffee cup with steam: "Kitchen's closed". */
export function CoffeeCupDrawing({ className }: { className?: string }) {
  return (
    <NeonDrawing label="A neon coffee cup" className={className}>
      <path d="M13 27h30v8a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13z" />
      <path d="M43 30h3a5.5 5.5 0 0 1 0 11h-4" />
      <path d="M9 53h38" />
      <path d="M22 19c-3-4 3-6 0-10" />
      <path d="M33 19c-3-4 3-6 0-10" />
    </NeonDrawing>
  );
}

/** A made bed: "nothing saved yet". */
export function BedDrawing({ className }: { className?: string }) {
  return (
    <NeonDrawing label="A neon bed" className={className}>
      <path d="M8 49V15" />
      <path d="M8 40h44v9" />
      <path d="M8 31h35a9 9 0 0 1 9 9" />
      <rect x="13" y="22" width="14" height="9" rx="3.5" />
    </NeonDrawing>
  );
}

/** A room key: the Keys tab before any match. */
export function KeyDrawing({ className }: { className?: string }) {
  return (
    <NeonDrawing label="A neon key" className={className}>
      <circle cx="19" cy="41" r="10" />
      <path d="M26.5 33.5 51 9" />
      <path d="m43 17 7 7" />
      <path d="m36 24 5 5" />
    </NeonDrawing>
  );
}

/** A roadside arrow sign: "wrong turn". */
export function ArrowSignDrawing({ className }: { className?: string }) {
  return (
    <NeonDrawing label="A neon arrow sign" className={className}>
      <path d="M10 10h31l10 10-10 10H10z" />
      <path d="M28 30v24" />
      <path d="M19 54h18" />
    </NeonDrawing>
  );
}
