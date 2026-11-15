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
