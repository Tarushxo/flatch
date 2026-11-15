import type { SVGProps } from "react";

/*
 * A few hand-drawn icons for the M0 shell. They are decorative here; the full
 * icon set (Phosphor) arrives with the deck in M1.
 */
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
    </Icon>
  );
}

export function CrossIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 4h10v16l-5-3.5L7 20V4Z" />
    </Icon>
  );
}

export function CardsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="7" width="13" height="14" rx="2.5" />
      <path d="M8 3.5h9.5A2.5 2.5 0 0 1 20 6v11" />
    </Icon>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="16" r="4" />
      <path d="M11 13 20 4M16.5 7.5l3 3M13.5 10.5l2 2" />
    </Icon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}
