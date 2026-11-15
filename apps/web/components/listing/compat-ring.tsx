const SIZES = {
  sm: { ring: "size-12", hole: "size-[2.45rem] text-[0.8125rem]" },
  lg: { ring: "size-20", hole: "size-[4.1rem] text-xl" },
} as const;

/**
 * The compatibility score as a ring. The number is fit only (budget, location,
 * timing, lifestyle); ranking extras never change it.
 */
export function CompatRing({
  percent,
  size = "sm",
}: {
  percent: number;
  size?: keyof typeof SIZES;
}) {
  return (
    <div
      role="img"
      aria-label={`${percent} percent match`}
      className={`grid shrink-0 place-items-center rounded-full ${SIZES[size].ring}`}
      style={{
        background: `conic-gradient(var(--win) ${percent * 3.6}deg, rgb(255 255 255 / 0.14) 0deg)`,
      }}
    >
      <div
        aria-hidden="true"
        className={`grid place-items-center rounded-full bg-ink/90 font-mono font-semibold text-fg tabular-nums ${SIZES[size].hole}`}
      >
        {percent}
      </div>
    </div>
  );
}
