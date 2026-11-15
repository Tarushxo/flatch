import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// A roadside arrow sign: square on the left, pointed on the right.
const ARROW = "polygon(0 0, calc(100% - 1.5rem) 0, 100% 50%, calc(100% - 1.5rem) 100%, 0 100%)";

const SIZES = {
  sm: { face: "py-2.5 pr-9 pl-5", text: "text-sm tracking-[0.18em]" },
  md: { face: "py-3.5 pr-12 pl-7", text: "text-lg tracking-[0.2em]" },
} as const;

/**
 * The app's main call to action: a neon arrow sign that points where it takes
 * you. A lit tube traces the arrow, the lettering glows, and the whole sign
 * flickers on and brightens when hovered or focused.
 *
 * Use it for the one primary link on a screen. Three layers are stacked: the
 * light the sign throws, the tube outline, and the dark face with the words.
 */
export function SignLink({
  href,
  children,
  colour = "var(--like)",
  size = "md",
}: {
  href: string;
  children: ReactNode;
  /** The neon colour. Defaults to the "like" cyan. */
  colour?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <Link
      href={href}
      className="group relative inline-block outline-offset-8 transition-transform duration-200 hover:translate-x-1 active:translate-x-0 active:scale-[0.97]"
      style={{ "--glow": colour } as CSSProperties}
    >
      {/* The light thrown on the wall behind the sign. It brightens on hover. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-60 transition-opacity duration-300 [filter:drop-shadow(0_0_5px_var(--glow))_drop-shadow(0_0_22px_var(--glow))] group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="absolute inset-0 bg-(--glow)" style={{ clipPath: ARROW }} />
      </span>

      {/* The tube: a bright outline around the dark face. */}
      <span
        className="relative block bg-[color-mix(in_oklab,var(--glow)_65%,white)] p-[2px]"
        style={{ clipPath: ARROW }}
      >
        <span
          className={`block bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--glow)_16%,var(--bg)),var(--bg)_78%)] ${SIZES[size].face}`}
          style={{ clipPath: ARROW }}
        >
          <span
            className={`sign block whitespace-nowrap font-sign uppercase group-hover:animate-switch-on group-focus-visible:animate-switch-on ${SIZES[size].text}`}
          >
            {children}
          </span>
        </span>
      </span>
    </Link>
  );
}
