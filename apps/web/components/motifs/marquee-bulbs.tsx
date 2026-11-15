/**
 * A row of marquee bulbs.
 *
 * As progress: `lit` of `total` bulbs are on, one per completed step. Screen
 * readers get a real <progress> element; the bulbs themselves are decorative.
 *
 * As a chase (`chase`): every bulb is on and the light runs along the row.
 * Reserved for celebrations: a match or a superlike.
 */
export function MarqueeBulbs({
  total,
  lit = total,
  chase = false,
  label,
}: {
  total: number;
  lit?: number;
  chase?: boolean;
  /** What the progress measures, for screen readers. Omit for a decorative chase. */
  label?: string;
}) {
  const bulbs = Array.from({ length: total }, (_, position) => ({
    id: `bulb-${position}`,
    on: position < lit,
    delay: `${position * 110}ms`,
  }));

  return (
    <div className="inline-flex items-center gap-2">
      {label ? <progress className="sr-only" aria-label={label} value={lit} max={total} /> : null}
      {bulbs.map((bulb) => (
        <span
          key={bulb.id}
          aria-hidden="true"
          className={`size-2.5 rounded-full transition-[background-color,box-shadow] duration-300 ${
            bulb.on
              ? "bg-save shadow-[0_0_10px_1px_var(--save),inset_0_-2px_3px_rgb(0_0_0/0.25)]"
              : "border border-hairline bg-save/10"
          } ${chase ? "animate-chase" : ""}`}
          style={chase ? { animationDelay: bulb.delay } : undefined}
        />
      ))}
    </div>
  );
}
