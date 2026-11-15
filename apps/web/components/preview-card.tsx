import { formatRent } from "@repo/shared";
import type { ReactNode } from "react";
import { BookmarkIcon, CrossIcon, HeartIcon } from "./icons";

/*
 * A static picture of what a deck card will look like. No photo yet (those
 * arrive with seed data), so the "photo" is the brand idea drawn in CSS:
 * a dark building where the flats are the lit windows.
 *
 * The whole thing is decorative and hidden from assistive tech. The real,
 * interactive deck replaces it in M1.
 */

// One string per floor, top to bottom. "." dark, "o" lit, "X" the one for you.
const FLOORS = ["..o...", "o...o.", "...o..", ".o...o", "..X.o.", "o.....", "...o.o", ".o...."];

type WindowKind = "dark" | "lit" | "yours";

const WINDOWS: { id: string; kind: WindowKind }[] = FLOORS.flatMap((floor, row) =>
  [...floor].map((cell, col) => ({
    id: `floor-${row}-window-${col}`,
    kind: cell === "X" ? "yours" : cell === "o" ? "lit" : "dark",
  })),
);

const CHIPS = ["Private room", "Furnished", "From 1 Dec"];

export function PreviewCard() {
  return (
    <div aria-hidden="true" className="w-full max-w-[21rem] select-none">
      <div className="surface relative aspect-[3/4.4] overflow-hidden rounded-[2rem]">
        <NightBuilding />

        {/* Photo index, stories style */}
        <div className="absolute inset-x-4 top-4 flex gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full ${i === 0 ? "bg-fg" : "bg-fg/25"}`}
            />
          ))}
        </div>

        <div className="absolute inset-x-4 top-9 flex items-start justify-between">
          <span className="rounded-full border border-hairline bg-ink/60 px-2.5 py-1 font-medium text-[0.6875rem] text-fg-2 uppercase tracking-[0.14em] backdrop-blur-md">
            Demo
          </span>
          <CompatibilityRing percent={92} />
        </div>

        {/* Legibility scrim and the facts a tenant decides on */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent px-5 pt-24 pb-5">
          <p className="font-mono font-semibold text-[1.75rem] text-fg leading-none tracking-tight tabular-nums">
            {formatRent(18500)}
          </p>
          <p className="mt-2 text-fg-2 text-sm">HSR Layout · 22 min to work</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-hairline bg-fg/[0.06] px-2.5 py-1 text-fg text-xs"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-5">
        <ActionDot colour="var(--pass)" size="lg">
          <CrossIcon className="size-6" />
        </ActionDot>
        <ActionDot colour="var(--save)" size="sm">
          <BookmarkIcon className="size-5" />
        </ActionDot>
        <ActionDot colour="var(--like)" size="lg" lit>
          <HeartIcon className="size-6" />
        </ActionDot>
      </div>
    </div>
  );
}

function NightBuilding() {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#1a1340] via-[#120e2a] to-ink">
      {/* City haze on the horizon */}
      <div className="absolute inset-x-0 top-[38%] h-40 bg-brand-b/20 blur-3xl" />
      <div className="absolute inset-x-[14%] top-[13%] bottom-0 rounded-t-xl border border-hairline border-b-0 bg-surface-2/95 px-4 pt-5">
        <div className="grid grid-cols-6 gap-x-2.5 gap-y-3">
          {WINDOWS.map((w) => (
            <Window key={w.id} kind={w.kind} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Window({ kind }: { kind: WindowKind }) {
  if (kind === "yours") {
    return <span className="glow aspect-[4/5] rounded-[3px] bg-like [--glow:var(--like)]" />;
  }
  if (kind === "lit") {
    return (
      <span className="aspect-[4/5] rounded-[3px] bg-save/75 shadow-[0_0_14px_-2px_rgb(255_197_61/0.55)]" />
    );
  }
  return <span className="aspect-[4/5] rounded-[3px] bg-fg/[0.045]" />;
}

function CompatibilityRing({ percent }: { percent: number }) {
  return (
    <div
      className="grid size-12 place-items-center rounded-full"
      style={{
        background: `conic-gradient(var(--win) ${percent * 3.6}deg, rgb(255 255 255 / 0.12) 0deg)`,
      }}
    >
      <div className="grid size-[2.45rem] place-items-center rounded-full bg-ink/90 font-mono font-semibold text-[0.8125rem] text-fg tabular-nums">
        {percent}
      </div>
    </div>
  );
}

function ActionDot({
  children,
  colour,
  size,
  lit = false,
}: {
  children: ReactNode;
  colour: string;
  size: "sm" | "lg";
  lit?: boolean;
}) {
  return (
    <span
      className={`grid place-items-center rounded-full border bg-surface-1 ${
        size === "lg" ? "size-16" : "size-12"
      } ${lit ? "glow border-transparent" : "border-hairline"}`}
      style={{ color: colour, ["--glow" as string]: colour }}
    >
      {children}
    </span>
  );
}
