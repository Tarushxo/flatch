import type { CSSProperties } from "react";

const SIZES = {
  /** A chip on a card. */
  sm: "gap-1.5 rounded-md px-2.5 py-1 text-[0.6875rem] tracking-[0.2em]",
  /** A listing header or the lister's switch. */
  md: "gap-2.5 rounded-lg px-4 py-2 text-lg tracking-[0.24em]",
} as const;

/**
 * The motel VACANCY sign, used as listing status.
 *
 * Open: "VACANCY" is lit and "NO" is a dark tube. Taken or paused: both words
 * light up in the pass colour. The lit words flicker on whenever the state
 * changes, like a sign being switched.
 */
export function VacancySign({ open, size = "md" }: { open: boolean; size?: keyof typeof SIZES }) {
  return (
    <span
      className={`inline-flex items-center border border-hairline bg-surface-2 font-sign uppercase ${SIZES[size]}`}
      style={{ "--glow": open ? "var(--like)" : "var(--pass)" } as CSSProperties}
    >
      <span className="sr-only">
        {open ? "Vacancy: this flat is open" : "No vacancy: this flat is taken"}
      </span>
      <span
        key={open ? "no-off" : "no-on"}
        aria-hidden="true"
        className={open ? "sign-unlit" : "sign animate-switch-on"}
      >
        NO
      </span>
      <span key={open ? "open" : "taken"} aria-hidden="true" className="sign animate-switch-on">
        VACANCY
      </span>
    </span>
  );
}
