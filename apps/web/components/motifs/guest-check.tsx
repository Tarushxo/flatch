import { formatRupees } from "@repo/shared";

// A torn bottom edge: the outline of the slip with a row of teeth along the bottom.
const TEETH = 18;
const TORN_EDGE = `polygon(0 0, 100% 0, ${Array.from({ length: TEETH + 1 }, (_, i) => {
  const x = (100 - (i * 100) / TEETH).toFixed(3);
  return `${x}% ${i % 2 === 0 ? "100%" : "calc(100% - 7px)"}`;
}).join(", ")})`;

/**
 * The real monthly cost of a flat, written up like a diner bill.
 *
 * Lines are the recurring costs; the total is worked out here so it can never
 * disagree with them. One-off money (the deposit) is listed separately as
 * "upfront" because it is not a monthly cost.
 */
export function GuestCheck({
  number,
  lines,
  upfront,
}: {
  /** The slip number in the corner. Decorative; a listing's short id works well. */
  number: string;
  lines: { label: string; amount: number }[];
  upfront?: { label: string; amount: number };
}) {
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <div
      className="w-full max-w-xs bg-surface-2 px-5 pt-5 pb-8 font-mono text-sm shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
      style={{ clipPath: TORN_EDGE }}
    >
      <div className="flex items-baseline justify-between border-fg-3/40 border-b border-dashed pb-3">
        <p className="font-sign text-fg tracking-[0.2em]">GUEST CHECK</p>
        <p className="text-fg-3 text-xs">No. {number}</p>
      </div>

      <dl className="mt-4 space-y-2.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline">
            <dt className="flex flex-1 items-baseline text-fg-2 after:mx-2 after:flex-1 after:border-fg-3/40 after:border-b after:border-dotted after:content-['']">
              {line.label}
            </dt>
            <dd className="tabular-nums">{formatRupees(line.amount)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-fg-3/60 border-t-4 border-double pt-3">
        <p className="font-semibold">Every month</p>
        <p className="font-semibold text-xl tabular-nums tracking-tight">{formatRupees(total)}</p>
      </div>

      {upfront ? (
        <p className="mt-3 text-fg-2 text-xs">
          Upfront, once: <span className="tabular-nums">{formatRupees(upfront.amount)}</span>{" "}
          {upfront.label}
        </p>
      ) : null}

      <p className="mt-5 text-center text-[0.6875rem] text-fg-3 tracking-[0.18em]">
        PAY NOTHING BEFORE YOU VISIT
      </p>
    </div>
  );
}
