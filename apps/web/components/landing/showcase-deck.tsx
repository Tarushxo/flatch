"use client";

import { formatRupees, type Listing, monthlyCost, ROOM_TYPE_LABELS } from "@repo/shared";
import {
  animate,
  type MotionStyle,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { CardFace } from "@/components/deck/card-face";
import { PHOTO_SIZES } from "@/lib/photo";

/*
 * A deck that swipes itself, for the landing page. It is a moving picture of
 * the product, not the product: nothing here can be dragged or tapped. People
 * who want to swipe follow the sign into the app.
 */

// What the invisible hand does, in order. A card that is liked, passed or saved leaves the
// deck. A card pulled down stays: its details slide up over it for a moment, as the sheet
// does in the app, and the next move is made on the same card.
const SCRIPT = [
  { label: "MOVE IN", colour: "var(--like)", x: 1, y: 0, place: "top-24 left-4 -rotate-12" },
  { label: "PASS", colour: "var(--pass)", x: -1, y: 0, place: "top-24 right-4 rotate-12" },
  {
    label: "DETAILS",
    colour: "var(--brand-a)",
    x: 0,
    y: 1,
    stays: true,
    place: "top-24 left-1/2 -translate-x-1/2",
  },
  { label: "MOVE IN", colour: "var(--like)", x: 1, y: 0, place: "top-24 left-4 -rotate-12" },
  {
    label: "MAYBE",
    colour: "var(--save)",
    x: 0,
    y: -1,
    place: "bottom-36 left-1/2 -translate-x-1/2 -rotate-6",
  },
] as const;

const stays = (move: (typeof SCRIPT)[number]) => "stays" in move && move.stays;
const LEAVING_PER_ROUND = SCRIPT.filter((move) => !stays(move)).length;

/** How many cards have left the deck by the time the script reaches this step. */
export function dealtBy(step: number): number {
  const rounds = Math.floor(step / SCRIPT.length);
  const thisRound = SCRIPT.slice(0, step % SCRIPT.length).filter((move) => !stays(move)).length;
  return rounds * LEAVING_PER_ROUND + thisRound;
}

const VISIBLE = 3;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function ShowcaseDeck({
  cards: CARDS,
}: {
  /** The flats to show, chosen by the page. Passed in so the demo data stays off the phone. */
  cards: Listing[];
}) {
  const [step, setStep] = useState(0);
  const stillOnly = useReducedMotion();
  const scene = useRef<HTMLDivElement>(null);
  const [watching, setWatching] = useState(true);

  // Nobody is looking when the deck is scrolled away or the tab is hidden: rest.
  useEffect(() => {
    const element = scene.current;
    if (!element) return;
    let onScreen = true;
    const update = () => setWatching(onScreen && !document.hidden);
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      update();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const stamp = useMotionValue(0);
  const visible = useMotionValue(1);
  const rotate = useTransform(x, (value) => value / 20);
  // The details sheet: 0 is tucked away below the card, 1 is fully up.
  const sheet = useMotionValue(0);
  const sheetY = useTransform(sheet, (value) => `${(1 - value) * 100}%`);

  const move = SCRIPT[step % SCRIPT.length] ?? SCRIPT[0];

  // The next card has just become the top card: show it before the browser paints.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per step on purpose
  useLayoutEffect(() => {
    visible.set(1);
  }, [step]);

  // One swipe: wait, lean with the stamp showing, hold, fly off, then hand over.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the motion values are stable
  useEffect(() => {
    if (stillOnly || !watching) return;
    let cancelled = false;

    (async () => {
      await pause(1900);
      if (cancelled) return;
      const lean = { duration: 0.6, ease: "easeInOut" } as const;
      await Promise.all([
        animate(x, move.x * 78, lean),
        // A pull down is shorter than a swipe away: the card resists, because it is staying.
        animate(y, move.y * (stays(move) ? 46 : 70), lean),
        animate(stamp, 1, { duration: 0.45 }),
      ]);
      await pause(420);
      if (cancelled) return;
      if (stays(move)) {
        // A pull down: the card settles back and its details come up over it, then go.
        await Promise.all([
          animate(y, 0, { type: "spring", stiffness: 300, damping: 25 }),
          animate(stamp, 0, { duration: 0.25 }),
          animate(sheet, 1, { duration: 0.5, ease: [0.32, 0.72, 0, 1] }),
        ]);
        await pause(2100);
        if (cancelled) return;
        await animate(sheet, 0, { duration: 0.35, ease: "easeIn" });
        if (cancelled) return;
        setStep((current) => current + 1);
        return;
      }
      const leave = { duration: 0.42, ease: "easeIn" } as const;
      await Promise.all([animate(x, move.x * 560, leave), animate(y, move.y * 760, leave)]);
      if (cancelled) return;
      // Hide the departed card, put the controls back to rest, bring up the next one.
      visible.set(0);
      x.set(0);
      y.set(0);
      stamp.set(0);
      setStep((current) => current + 1);
    })();

    return () => {
      cancelled = true;
      x.stop();
      y.stop();
      stamp.stop();
      sheet.stop();
      // If the swipe was cut short, put the card back so the next one starts clean.
      x.set(0);
      y.set(0);
      stamp.set(0);
      sheet.set(0);
    };
  }, [step, stillOnly, watching]);

  const stack = Array.from({ length: VISIBLE }, (_, depth) => ({
    depth,
    listing: CARDS[(dealtBy(step) + depth) % CARDS.length],
  }));
  const top = stack[0]?.listing;

  return (
    <div
      ref={scene}
      aria-hidden="true"
      className="pointer-events-none relative h-full w-full select-none"
    >
      {stack.map(({ depth, listing }) =>
        listing ? (
          <motion.div
            key={listing.id}
            className="absolute inset-0"
            initial={false}
            animate={{ scale: 1 - depth * 0.06, y: depth * 14 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ zIndex: VISIBLE - depth }}
          >
            {/* Same element at every depth, so a card is not rebuilt (and its
                photo does not reload) when it reaches the top. */}
            <motion.div
              className="size-full"
              style={depth === 0 ? { x, y, rotate, opacity: visible } : undefined}
            >
              <CardFace
                listing={listing}
                photoIndex={0}
                sizes={PHOTO_SIZES.showcaseCard}
                priority={depth === 0}
              />
              {/* Cards further back are dimmer */}
              <div
                className={`absolute inset-0 rounded-[2rem] bg-ink transition-opacity duration-300 ${
                  depth === 0 ? "opacity-0" : "opacity-45"
                }`}
              />
              {depth === 0 ? (
                <motion.div
                  className="absolute inset-0"
                  style={{ opacity: stamp, "--glow": move.colour } as MotionStyle}
                >
                  <div className="glow absolute inset-0 rounded-[2rem]" />
                  <span
                    className={`sign absolute rounded-xl border-[3px] bg-ink/75 px-4 py-1.5 font-sign text-3xl tracking-wide ${move.place}`}
                    style={{ borderColor: move.colour } as CSSProperties}
                  >
                    {move.label}
                  </span>
                </motion.div>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null,
      )}

      {/* The details of the card on top, rising over it the way the sheet does in the app. */}
      {top ? (
        <div
          className="absolute inset-0 overflow-hidden rounded-[2rem]"
          style={{ zIndex: VISIBLE + 1 }}
        >
          <motion.div
            className="absolute inset-x-0 bottom-0 h-[68%] rounded-t-[1.75rem] border border-hairline border-b-0 bg-surface-1 px-5 pt-3"
            style={{ y: sheetY }}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-fg/25" />
            <p className="mt-4 line-clamp-1 font-display font-semibold text-lg tracking-tight">
              {top.title}
            </p>
            <p className="mt-0.5 truncate text-fg-2 text-xs">
              {top.locality} · {ROOM_TYPE_LABELS[top.roomType]}
            </p>
            <p className="mt-5 text-[0.625rem] text-fg-3 uppercase tracking-[0.18em]">
              What it costs
            </p>
            <dl className="mt-2 space-y-1.5 font-mono text-xs tabular-nums">
              {[
                ["Rent", top.rent],
                ["Maintenance", top.maintenance],
                ["Electricity + wifi", top.utilitiesEstimate],
              ].map(([label, amount]) => (
                <div key={label} className="flex justify-between gap-3 text-fg-2">
                  <dt>{label}</dt>
                  <dd>{formatRupees(Number(amount))}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-hairline border-t pt-1.5 text-fg">
                <dt>Per month</dt>
                <dd>{formatRupees(monthlyCost(top))}</dd>
              </div>
            </dl>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {top.amenities.slice(0, 3).map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-md border border-hairline bg-surface-2 px-2 py-1 font-sign text-[0.625rem] text-fg-2 uppercase tracking-[0.16em]"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
