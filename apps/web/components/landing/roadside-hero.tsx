"use client";

import type { Listing } from "@repo/shared";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { KeyTag } from "@/components/motifs/key-tag";
import { Pylon } from "./pylon";
import { ShowcaseDeck } from "./showcase-deck";
import { usePointerTilt } from "./use-pointer-tilt";

/*
 * The landing page's hero as a place: a roadside at night. Stars, a city on the
 * horizon, a road, the sign planted beside it and the deck mounted on a lit
 * billboard. On a wide screen the layers slide by different amounts as the
 * pointer moves, which is what gives the scene depth, and now and then a car's
 * headlights cross the horizon.
 *
 * Everything is drawn in code from the design tokens. Only transform and
 * opacity move, and nothing moves for people who prefer less motion.
 */

// Fixed positions, so the server and the browser draw the same sky.
const STARS = [
  [3, 9],
  [8, 31],
  [13, 17],
  [18, 5],
  [22, 26],
  [27, 43],
  [31, 12],
  [36, 3],
  [40, 22],
  [45, 36],
  [49, 8],
  [54, 19],
  [58, 41],
  [62, 4],
  [67, 28],
  [71, 13],
  [76, 38],
  [80, 7],
  [84, 24],
  [88, 15],
  [92, 33],
  [96, 10],
  [6, 52],
  [34, 55],
  [60, 54],
  [86, 50],
].map(([x, y], n) => ({ id: n, x, y, delay: `${(n * 370) % 3600}ms`, big: n % 5 === 0 }));

const WINDOWS = [
  [36, 62],
  [44, 50],
  [118, 58],
  [126, 70],
  [198, 44],
  [206, 56],
  [214, 68],
  [300, 60],
  [378, 48],
  [386, 62],
  [470, 54],
  [548, 66],
  [556, 50],
  [640, 58],
  [716, 46],
  [724, 60],
  [800, 64],
  [884, 52],
].map(([x, y], n) => ({ id: n, x, y, on: n % 3 !== 1 }));

/** A backdrop layer that slides sideways with the pointer. Further layers move less. */
function Layer({
  depth,
  className = "",
  children,
}: {
  depth: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute transition-transform duration-300 ease-out ${className}`}
      style={{ transform: `translateX(calc(var(--px, 0) * ${-depth}px))` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/** Something standing in the scene, in front of the backdrop. It slides the most. */
function Standing({ depth, children }: { depth: number; children: ReactNode }) {
  return (
    <div
      className="transition-transform duration-300 ease-out"
      style={{ transform: `translateX(calc(var(--px, 0) * ${-depth}px))` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function RoadsideHero({
  cards,
  children,
}: {
  /** The flats the billboard's deck swipes through. */
  cards: Listing[];
  /** The headline, the pitch and the way in. */
  children: ReactNode;
}) {
  const scene = usePointerTilt<HTMLElement>();

  return (
    <section ref={scene} className="relative isolate overflow-hidden">
      {/* The glow of the city on the sky above the horizon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[9.5rem] h-[26rem] bg-[radial-gradient(60%_100%_at_50%_100%,color-mix(in_oklab,var(--brand-b)_17%,transparent),transparent_70%),radial-gradient(45%_70%_at_20%_100%,color-mix(in_oklab,var(--brand-a)_20%,transparent),transparent_70%)]"
      />

      <Layer depth={4} className="inset-x-0 top-0 h-[70%]">
        {STARS.map((star) => (
          <span
            key={star.id}
            className={`absolute animate-twinkle rounded-full bg-fg ${star.big ? "size-[3px]" : "size-[2px]"}`}
            style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: star.delay }}
          />
        ))}
      </Layer>

      {/* The far city, then the near one */}
      <Layer depth={9} className="-inset-x-8 bottom-[9.5rem] h-48 lg:h-60">
        <svg
          viewBox="0 0 880 160"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="size-full"
        >
          <path
            fill="color-mix(in oklab, var(--brand-a) 16%, var(--surface-2))"
            opacity="0.85"
            d="M0 160V96h40V70h36v26h30V52h44v44h28V78h52v18h36V40h30v56h46V84h40V60h34v36h50V72h44v24h38V48h36v48h52V80h40V62h30v34h46V56h42v40h36V88h50v72Z"
          />
        </svg>
      </Layer>
      <Layer depth={16} className="-inset-x-8 bottom-[9.5rem] h-32 lg:h-40">
        <svg
          viewBox="0 0 900 112"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="size-full"
        >
          <path
            fill="var(--surface-1)"
            d="M0 112V64h28V40h60v24h22V30h58v34h34V52h70v12h26V22h52v42h40V46h64v18h30V34h56v30h44V50h62v14h24V28h54v36h38V44h66v20h30V58h42v54Z"
          />
          {WINDOWS.map((pane) => (
            <rect
              key={pane.id}
              x={pane.x}
              y={pane.y}
              width="4"
              height="5"
              fill="var(--save)"
              opacity={pane.on ? 0.55 : 0.12}
            />
          ))}
        </svg>
      </Layer>

      {/* Headlights passing along the horizon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[9.25rem] h-3 overflow-hidden"
      >
        <div className="h-full w-44 animate-headlights bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--save)_70%,white)_0%,transparent_70%)] opacity-0" />
      </div>

      {/* The ground, from the horizon down: the verge the sign and the billboard stand on, the
          road with its two edges and its centre line, and a shoulder that fades into the page
          below, so the scene does not end on a hard line. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[9.5rem]"
      >
        <div className="absolute inset-x-0 top-0 h-14 border-hairline border-t bg-gradient-to-b from-surface-1 to-ink" />
        <div className="absolute inset-x-0 top-14 h-16 bg-[color-mix(in_oklab,var(--surface-2)_55%,var(--bg))]">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-fg/20" />
          <div className="-translate-y-1/2 absolute inset-x-0 top-1/2 h-1 bg-[repeating-linear-gradient(to_right,color-mix(in_oklab,var(--save)_60%,transparent)_0_34px,transparent_34px_68px)]" />
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-fg/20" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-ink to-transparent" />
      </div>

      {/* What stands in the scene: the sign, the words, the billboard. Their feet are a
          little in front of the horizon, on the verge above the road. */}
      <div className="relative mx-auto grid w-full max-w-6xl gap-x-8 gap-y-10 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[7.25rem] sm:px-8 lg:min-h-dvh lg:grid-cols-[18rem_minmax(0,1fr)_20rem] lg:items-end">
        <Standing depth={24}>
          <div className="relative">
            <Pylon />
            {/* The pool of light the sign throws on the ground */}
            <div
              aria-hidden="true"
              className="-translate-x-1/2 pointer-events-none absolute -bottom-5 left-1/2 hidden h-10 w-72 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--brand-b)_45%,transparent)_0%,transparent_70%)] lg:block"
            />
          </div>
        </Standing>

        <div className="relative z-10 mx-auto max-w-xl text-center lg:mx-0 lg:self-center lg:pb-28 lg:text-left">
          {children}
        </div>

        {/* The billboard: the deck, lit from above, on two legs. One link into the app. */}
        <Standing depth={34}>
          <Link
            href="/discover"
            aria-label="See the deck: start swiping"
            className="group relative mx-auto block w-fit rounded-[2.25rem] outline-offset-8"
          >
            {/* Lamps on arms over the top edge */}
            <div aria-hidden="true" className="absolute inset-x-8 -top-5 flex justify-between">
              {[0, 1, 2].map((lamp) => (
                <span key={lamp} className="flex flex-col items-center">
                  <span className="h-4 w-px bg-fg/40" />
                  <span className="h-1.5 w-5 rounded-b-full bg-save shadow-[0_6px_18px_2px_color-mix(in_oklab,var(--save)_70%,transparent)]" />
                </span>
              ))}
            </div>
            <div className="relative h-[29.5rem] w-[19rem] rounded-[2.25rem] border border-fg/15 bg-surface-1 p-2 transition-transform duration-300 group-hover:-translate-y-1">
              <div aria-hidden="true" className="relative size-full">
                <ShowcaseDeck cards={cards} />
              </div>
              {/* The key you get when you match, hung on the corner */}
              <div
                aria-hidden="true"
                className="absolute -top-10 -right-6 z-10 rotate-[7deg] scale-[0.72] sm:-right-10"
              >
                <KeyTag locality="HSR Layout" detail="It's a match" />
              </div>
            </div>
            <div aria-hidden="true" className="mx-auto flex h-16 w-3/5 justify-between">
              <span className="w-1.5 bg-gradient-to-b from-fg/35 to-fg/10" />
              <span className="w-1.5 bg-gradient-to-b from-fg/35 to-fg/10" />
            </div>
          </Link>
        </Standing>
      </div>
    </section>
  );
}
