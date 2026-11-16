"use client";

import { CITIES } from "@repo/shared";
import { type CSSProperties, useState } from "react";
import { Logo } from "@/components/logo";
import { VacancySign } from "@/components/motifs/vacancy-sign";

/*
 * The roadside sign that heads the landing page, built as a real structure:
 * two steel posts, a starburst on top, the logo on a shaped board ringed with
 * marquee bulbs, the VACANCY box bolted under it and plaques that drop in on
 * their chains. It turns a little towards the pointer wherever that is in the
 * scene around it (the scene sets --px and --py; see use-pointer-tilt.ts), the
 * plaques swing when touched, and a pull chain switches the whole sign off and on.
 *
 * Only transform and opacity move. People who prefer less motion get the sign
 * lit and still.
 */

const PLAQUES = [
  { label: "Rooms", tint: "var(--like)" },
  { label: "Flatmates", tint: "var(--save)" },
  { label: `${CITIES.length} cities`, tint: "var(--brand-b)" },
];

/** Bulbs round the edge of the board, lit in a chase. */
function BulbFrame({ lit }: { lit: boolean }) {
  const strip = (count: number, start: number) =>
    Array.from({ length: count }, (_, n) => ({ id: start + n, delay: `${(start + n) * 80}ms` }));
  const bulb = (each: { id: number; delay: string }) => (
    <span
      key={each.id}
      className={`size-2 rounded-full transition-opacity duration-300 ${
        lit
          ? "animate-chase bg-save shadow-[0_0_8px_1px_var(--save)]"
          : "border border-hairline bg-save/10"
      }`}
      style={lit ? { animationDelay: each.delay } : undefined}
    />
  );
  return (
    <span aria-hidden="true" className="pointer-events-none absolute -inset-3">
      <span className="absolute inset-x-5 top-0 flex justify-between">
        {strip(11, 0).map(bulb)}
      </span>
      <span className="absolute inset-y-5 right-0 flex flex-col justify-between">
        {strip(4, 11).map(bulb)}
      </span>
      <span className="absolute inset-x-5 bottom-0 flex flex-row-reverse justify-between">
        {strip(11, 15).map(bulb)}
      </span>
      <span className="absolute inset-y-5 left-0 flex flex-col-reverse justify-between">
        {strip(4, 26).map(bulb)}
      </span>
    </span>
  );
}

/** The starburst that tops a Googie sign. Two strokes: the tube, and its light. */
function Starburst({ lit }: { lit: boolean }) {
  const rays = Array.from({ length: 8 }, (_, n) => n * 45);
  return (
    <svg
      viewBox="-40 -40 80 80"
      aria-hidden="true"
      className={`size-16 transition-opacity duration-300 ${lit ? "animate-twinkle" : "opacity-20"}`}
    >
      {rays.map((angle) => (
        <g key={angle} transform={`rotate(${angle})`}>
          <line
            y1="-8"
            y2={angle % 90 === 0 ? -36 : -22}
            stroke="var(--save)"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.18"
          />
          <line
            y1="-8"
            y2={angle % 90 === 0 ? -36 : -22}
            stroke="color-mix(in oklab, var(--save) 40%, white)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}
      <circle r="4" fill="color-mix(in oklab, var(--save) 40%, white)" />
    </svg>
  );
}

export function Pylon() {
  const [lit, setLit] = useState(true);
  const post =
    "absolute top-12 bottom-0 w-2 rounded-t-full bg-gradient-to-b from-fg/40 via-fg/20 to-transparent lg:to-fg/10";

  return (
    <div className="relative flex justify-center [perspective:900px]">
      <div
        className="relative flex w-72 flex-col items-center gap-4 pb-14 transition-transform duration-200 ease-out lg:pb-28"
        style={{
          transform: "rotateY(calc(var(--px, 0) * 7deg)) rotateX(calc(var(--py, 0) * -5deg))",
        }}
      >
        {/* The two posts, running down behind everything. On a wide screen they reach the ground. */}
        <span aria-hidden="true" className={`${post} left-[calc(50%-3.5rem)]`} />
        <span aria-hidden="true" className={`${post} right-[calc(50%-3.5rem)]`} />

        <Starburst lit={lit} />

        {/* The board: off-square, like the signs it borrows from. */}
        <div className="-rotate-2 relative rounded-[2.75rem_2.75rem_2.75rem_0.9rem] border border-brand-b/35 bg-surface-1 px-7 pt-3 pb-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.07)]">
          <BulbFrame lit={lit} />
          <Logo size="lg" lit={lit} />
          <p
            className={`-mt-1 text-center font-sign text-[0.6875rem] uppercase tracking-[0.34em] transition-colors duration-300 ${
              lit ? "text-fg-2" : "text-fg-3/60"
            }`}
          >
            Flats &amp; flatmates
          </p>
        </div>

        <div className="relative z-10 animate-drop-in" style={{ animationDelay: "0.5s" }}>
          {/* Switched off, the box goes dark with the rest. It never reads NO VACANCY here:
              that would say there are no flats, which is not what the chain means. */}
          <div className={`transition-opacity duration-300 ${lit ? "" : "opacity-30"}`}>
            <VacancySign open />
          </div>
        </div>

        {/* Plaques on their chains. Each drops in, and swings again when touched. */}
        <ul className="relative z-10 flex flex-col items-center gap-2">
          {PLAQUES.map((plaque, position) => (
            <li
              key={plaque.label}
              className="origin-top animate-drop-in"
              style={{ animationDelay: `${0.75 + position * 0.18}s` }}
            >
              <span
                className="block origin-top rounded-md border bg-surface-2 px-5 py-1.5 text-center font-sign text-xs uppercase tracking-[0.22em] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] transition-opacity duration-300 hover:animate-swing"
                style={
                  {
                    color: plaque.tint,
                    borderColor: `color-mix(in oklab, ${plaque.tint} 35%, transparent)`,
                    opacity: lit ? 1 : 0.45,
                  } as CSSProperties
                }
              >
                {plaque.label}
              </span>
            </li>
          ))}
        </ul>

        {/* The pull chain. */}
        <button
          type="button"
          onClick={() => setLit((on) => !on)}
          aria-pressed={!lit}
          aria-label={lit ? "Switch the sign off" : "Switch the sign on"}
          className="group absolute top-[13.5rem] -right-2 flex flex-col items-center outline-offset-4"
        >
          <span
            aria-hidden="true"
            className="h-14 w-px origin-top bg-[repeating-linear-gradient(to_bottom,rgb(255_255_255/0.5)_0_3px,transparent_3px_6px)] transition-transform duration-150 group-active:scale-y-110"
          />
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-fg/40 bg-surface-2 transition-transform duration-150 group-hover:scale-125 group-active:translate-y-1.5"
          />
          <span className="mt-1.5 font-sign text-[0.5625rem] text-fg-3 uppercase tracking-[0.2em]">
            Pull
          </span>
        </button>
      </div>
    </div>
  );
}
