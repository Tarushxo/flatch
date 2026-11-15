import type { CSSProperties } from "react";

const SPARKS = Array.from({ length: 10 }, (_, position) => ({
  id: `spark-${position}`,
  angle: `${position * 36}deg`,
  delay: `${(position % 3) * 25}ms`,
}));

/**
 * A ring of sparks that flies out from a button once, then is gone. Render it
 * inside a `relative` element and give it a new `key` each time it should fire.
 * It takes the current text colour.
 */
export function Sparks() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {SPARKS.map((spark) => (
        <span
          key={spark.id}
          className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] size-1.5 animate-spark rounded-full bg-current shadow-[0_0_8px_1px_currentColor]"
          style={{ "--angle": spark.angle, animationDelay: spark.delay } as CSSProperties}
        />
      ))}
    </span>
  );
}
