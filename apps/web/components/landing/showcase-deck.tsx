"use client";

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
import { MOCK_LISTINGS } from "@/lib/api/mock/listings";
import { PHOTO_SIZES } from "@/lib/photo";

/*
 * A deck that swipes itself, for the landing page. It is a moving picture of
 * the product, not the product: nothing here can be dragged or tapped. People
 * who want to swipe follow the sign into the app.
 */

const CARDS = MOCK_LISTINGS.slice(0, 6);

// What the invisible hand does to each card in turn.
const SCRIPT = [
  { label: "MOVE IN", colour: "var(--like)", x: 1, y: 0, place: "top-24 left-4 -rotate-12" },
  { label: "PASS", colour: "var(--pass)", x: -1, y: 0, place: "top-24 right-4 rotate-12" },
  { label: "MOVE IN", colour: "var(--like)", x: 1, y: 0, place: "top-24 left-4 -rotate-12" },
  {
    label: "MAYBE",
    colour: "var(--save)",
    x: 0,
    y: -1,
    place: "bottom-36 left-1/2 -translate-x-1/2 -rotate-6",
  },
] as const;

const VISIBLE = 3;
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function ShowcaseDeck() {
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
        animate(y, move.y * 70, lean),
        animate(stamp, 1, { duration: 0.45 }),
      ]);
      await pause(420);
      if (cancelled) return;
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
      // If the swipe was cut short, put the card back so the next one starts clean.
      x.set(0);
      y.set(0);
      stamp.set(0);
    };
  }, [step, stillOnly, watching]);

  const stack = Array.from({ length: VISIBLE }, (_, depth) => ({
    depth,
    listing: CARDS[(step + depth) % CARDS.length],
  }));

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
    </div>
  );
}
