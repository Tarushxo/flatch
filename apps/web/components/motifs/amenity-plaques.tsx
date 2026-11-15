const TINTS = ["var(--like)", "var(--save)", "var(--brand-b)", "var(--win)"];

/**
 * Amenities as the small plaques that hang under a motel sign
 * ("COLOR TV", "POOL", "AIR CONDITIONED").
 *
 * `stack` hangs them in a column on two chains, for the sign assembly and the
 * listing detail. `row` wraps them like chips, for tight spaces.
 */
export function AmenityPlaques({
  items,
  layout = "stack",
}: {
  items: string[];
  layout?: "stack" | "row";
}) {
  const plaques = items.map((name, position) => ({
    name,
    tint: TINTS[position % TINTS.length] ?? "var(--like)",
  }));

  const list = (
    <ul className={layout === "stack" ? "relative flex flex-col gap-1.5" : "flex flex-wrap gap-2"}>
      {plaques.map((plaque) => (
        <li
          key={plaque.name}
          className="rounded-md border bg-surface-2 px-4 py-1.5 text-center font-sign text-xs uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
          style={{
            color: plaque.tint,
            borderColor: `color-mix(in oklab, ${plaque.tint} 35%, transparent)`,
          }}
        >
          {plaque.name}
        </li>
      ))}
    </ul>
  );

  if (layout === "row") return list;

  return (
    <div className="relative inline-block min-w-40 py-2">
      {/* The two chains the plaques hang from */}
      <span aria-hidden="true" className="absolute inset-y-0 left-[22%] w-px bg-fg/20" />
      <span aria-hidden="true" className="absolute inset-y-0 right-[22%] w-px bg-fg/20" />
      {list}
    </div>
  );
}
