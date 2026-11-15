import { APP_NAME } from "@repo/shared";
import { NeonSign } from "./neon-sign";

const SIZES = {
  /** Compact: in-app top bars. */
  sm: "text-4xl",
  /** Default: page headers. */
  md: "text-5xl sm:text-6xl",
  /** Hero moments: landing page, match screen. */
  lg: "text-7xl sm:text-8xl",
} as const;

/**
 * The product logo: the app name as a flickering motel neon sign.
 *
 * Every screen that shows the logo uses this component, so the typeface,
 * colour and flicker are identical everywhere. Only the size varies.
 */
export function Logo({ size = "md" }: { size?: keyof typeof SIZES }) {
  return (
    <NeonSign
      text={APP_NAME}
      font="logo"
      className={`px-1 leading-[1.2] [--glow:var(--brand-b)] ${SIZES[size]}`}
    />
  );
}
