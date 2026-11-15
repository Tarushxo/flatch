"use client";

import type { Listing } from "@repo/shared";
import {
  animate,
  type MotionStyle,
  type MotionValue,
  motion,
  type PanInfo,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from "motion/react";
import { type Ref, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { InfoIcon } from "@/components/icons";
import {
  type DeckAction,
  decideSwipe,
  dragProgress,
  flyOutTarget,
  followY,
  rotationFor,
  stampOpacity,
} from "@/lib/deck/gesture";
import { buzz } from "@/lib/haptics";
import { CardFace } from "./card-face";

/** What the deck can ask the top card to do (for the buttons and the keyboard). */
export type DeckCardHandle = {
  flyOut: (action: DeckAction) => void;
  showPhoto: (step: 1 | -1) => void;
};

const SPRING_BACK = { type: "spring", stiffness: 300, damping: 25 } as const;
const STILL = { x: 0, y: 0 };

/** How much smaller and lower each card sits behind the one in front. */
const STACK = { scaleStep: 0.06, offsetY: 12, maxShade: 0.45 };

const STAMPS = [
  { action: "like", label: "MOVE IN", colour: "var(--like)", place: "top-28 left-5 -rotate-12" },
  { action: "pass", label: "PASS", colour: "var(--pass)", place: "top-28 right-5 rotate-12" },
  {
    action: "save",
    label: "MAYBE",
    colour: "var(--save)",
    place: "bottom-40 left-1/2 -translate-x-1/2 -rotate-6",
  },
  {
    action: "details",
    label: "DETAILS",
    colour: "var(--brand-a)",
    place: "top-28 left-1/2 -translate-x-1/2",
  },
] as const;

type StampAction = (typeof STAMPS)[number]["action"];

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * One card in the deck. The top card (index 0) can be dragged; the ones behind
 * it scale up and brighten as the top card is dragged away.
 *
 * `progress` is shared by the whole deck: the top card writes how close its
 * drag is to committing (0 to 1) and the cards behind read it.
 */
export function DeckCard({
  listing,
  index,
  progress,
  enterFrom,
  onLeaving,
  onCommit,
  onEntered,
  onOpenDetails,
  onPhotoChange,
  ref,
}: {
  listing: Listing;
  index: number;
  progress: MotionValue<number>;
  /** Set when the card is coming back from an undo: the action it originally left with. */
  enterFrom?: DeckAction;
  /** Called the moment the card starts to leave, before it has gone. */
  onLeaving?: (action: DeckAction) => void;
  /** Called once the card is off-screen. */
  onCommit: (action: DeckAction) => void;
  onEntered?: () => void;
  onOpenDetails: () => void;
  onPhotoChange?: (dominantColor: string) => void;
  ref?: Ref<DeckCardHandle>;
}) {
  const isTop = index === 0;
  const element = useRef<HTMLDivElement>(null);
  const size = useRef({ width: 380, height: 580 });
  const grabbedBottomHalf = useRef(false);
  const flying = useRef(false);
  const panned = useRef(false);
  const indexRef = useRef(index);
  const [photoIndex, setPhotoIndex] = useState(0);

  // Where the finger has dragged the card. A returning card starts off-screen.
  const x = useMotionValue(startOffset(enterFrom).x);
  const y = useMotionValue(startOffset(enterFrom).y);
  const stackIndex = useMotionValue(index);

  // Depth 0 is the front. A card behind moves towards the front as the top card leaves.
  const depth = useTransform(() => Math.max(0, stackIndex.get() - progress.get()));
  const scale = useTransform(depth, (d) => 1 - STACK.scaleStep * d);
  const shade = useTransform(depth, (d) => Math.min(d, 1) * STACK.maxShade);
  const shownY = useTransform(() => followY(y.get()) + STACK.offsetY * depth.get());
  const rotate = useTransform(x, (value) =>
    rotationFor(value, size.current.width, grabbedBottomHalf.current),
  );

  const stamp = {
    like: useTransform(() => stampOpacity({ x: x.get(), y: y.get() }, size.current).like),
    pass: useTransform(() => stampOpacity({ x: x.get(), y: y.get() }, size.current).pass),
    save: useTransform(() => stampOpacity({ x: x.get(), y: y.get() }, size.current).save),
    details: useTransform(() => stampOpacity({ x: x.get(), y: y.get() }, size.current).details),
  };

  // Which stamp is in play. Only that one is drawn: a stamp is a full-card glow with
  // deep shadows, and four of them fading on every frame is heavy work for a phone.
  const [showing, setShowing] = useState<StampAction | null>(null);
  const showingRef = useRef<StampAction | null>(null);

  /** The top card tells the rest of the deck how far it has been dragged. */
  function report() {
    if (indexRef.current !== 0) return;
    const offset = { x: x.get(), y: y.get() };
    const strengths = stampOpacity(offset, size.current);
    let strongest: StampAction | null = null;
    for (const { action } of STAMPS) {
      if (strengths[action] > (strongest ? strengths[strongest] : 0)) strongest = action;
    }
    // State changes only when the stamp in play changes, not on every frame.
    if (strongest !== showingRef.current) {
      showingRef.current = strongest;
      setShowing(strongest);
    }
    const next = dragProgress(offset, size.current);
    if (next >= 1 && progress.get() < 1 && !flying.current) buzz(10);
    progress.set(next);
  }
  useMotionValueEvent(x, "change", report);
  useMotionValueEvent(y, "change", report);

  // Runs before paint whenever the deck reorders, so nothing visibly jumps.
  // biome-ignore lint/correctness/useExhaustiveDependencies: report reads only refs and motion values
  useLayoutEffect(() => {
    indexRef.current = index;
    stackIndex.set(index);
    measure();
    report();
  }, [index, stackIndex]);

  // A card restored by undo slides back in from where it left.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once, when the card mounts
  useEffect(() => {
    if (!enterFrom) return;
    flying.current = true;
    Promise.all([animate(x, 0, SPRING_BACK), animate(y, 0, SPRING_BACK)]).then(() => {
      flying.current = false;
      onEntered?.();
    });
  }, []);

  const photo = listing.photos[photoIndex] ?? listing.photos[0];
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the colour and position matter
  useEffect(() => {
    if (isTop && photo) onPhotoChange?.(photo.dominantColor);
  }, [isTop, photo?.dominantColor]);

  function measure() {
    const rect = element.current?.getBoundingClientRect();
    if (rect && rect.width > 0) size.current = { width: rect.width, height: rect.height };
    return rect;
  }

  function flyOut(action: DeckAction, offset = STILL, velocity = STILL) {
    if (flying.current) return;
    flying.current = true;
    onLeaving?.(action);
    const target = flyOutTarget(action, offset, velocity, viewport());
    const options = { duration: target.duration, ease: "easeOut" } as const;
    // followY shortens upward travel, so aim further to clear the screen.
    Promise.all([animate(x, target.x, options), animate(y, target.y * 1.2, options)]).then(() =>
      onCommit(action),
    );
  }

  function showPhoto(step: 1 | -1) {
    setPhotoIndex((current) => Math.min(listing.photos.length - 1, Math.max(0, current + step)));
  }

  useImperativeHandle(ref, () => ({ flyOut: (action) => flyOut(action), showPhoto }));

  function onPanStart(event: PointerEvent) {
    if (flying.current) return;
    panned.current = true;
    const rect = measure();
    grabbedBottomHalf.current = rect ? event.clientY - rect.top > rect.height / 2 : false;
  }

  function onPan(_event: PointerEvent, info: PanInfo) {
    if (flying.current) return;
    x.set(info.offset.x);
    y.set(info.offset.y);
  }

  function onPanEnd(_event: PointerEvent, info: PanInfo) {
    if (flying.current) return;
    const gesture = decideSwipe(info.offset, info.velocity, size.current);
    if (gesture && gesture !== "details") {
      flyOut(gesture, info.offset, info.velocity);
      return;
    }
    // The card stays: it settles back, and a pull down opens the details.
    animate(x, 0, SPRING_BACK);
    animate(y, 0, SPRING_BACK);
    if (gesture === "details") onOpenDetails();
  }

  /** A tap on the left or right third of the photo flips through the photos. */
  function onTap(event: MouseEvent | TouchEvent | PointerEvent) {
    if (panned.current || flying.current) return;
    const rect = measure();
    if (!rect || !("clientX" in event)) return;
    const along = (event.clientX - rect.left) / rect.width;
    const down = (event.clientY - rect.top) / rect.height;
    if (down > 0.7) onOpenDetails();
    else if (along < 1 / 3) showPhoto(-1);
    else if (along > 2 / 3) showPhoto(1);
  }

  const inPlay = STAMPS.find((each) => each.action === showing);

  return (
    <motion.div
      ref={element}
      aria-hidden={!isTop}
      // Every card in the stack moves or grows on each frame of a drag, so each gets its own
      // layer. Without it the phone redraws the photo, gradients and ring of the cards behind
      // on every frame.
      className={`absolute inset-0 touch-none select-none will-change-transform ${
        isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
      }`}
      style={{ x, y: shownY, rotate, scale, zIndex: 10 - index }}
      onPointerDown={() => {
        panned.current = false;
      }}
      onPanStart={isTop ? onPanStart : undefined}
      onPan={isTop ? onPan : undefined}
      onPanEnd={isTop ? onPanEnd : undefined}
      onTap={isTop ? onTap : undefined}
    >
      <CardFace
        listing={listing}
        photoIndex={photoIndex}
        priority={isTop}
        // A flat with no score yet (one a real person posted, until M5) shows no ring.
        showMatch={listing.compatibility.percent > 0}
      />

      {/* Cards further back are dimmer */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[2rem] bg-ink"
        style={{ opacity: shade }}
      />

      {isTop && inPlay ? (
        <motion.div
          key={inPlay.action}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 will-change-[opacity]"
          style={{ opacity: stamp[inPlay.action], "--glow": inPlay.colour } as MotionStyle}
        >
          {/* The card's edge lights up in the colour of the action */}
          <div className="glow absolute inset-0 rounded-[2rem]" />
          <span
            className={`sign absolute rounded-xl border-[3px] bg-ink/75 px-4 py-1.5 font-sign text-4xl tracking-wide ${inPlay.place}`}
            style={{ borderColor: inPlay.colour }}
          >
            {inPlay.label}
          </span>
        </motion.div>
      ) : null}

      {isTop ? (
        <button
          type="button"
          aria-label={`Details for ${listing.title}`}
          onClick={onOpenDetails}
          className="absolute right-4 bottom-[5.5rem] grid size-10 place-items-center rounded-full border border-hairline bg-ink/75 text-fg transition-colors hover:bg-ink/90"
        >
          <InfoIcon className="size-5" />
        </button>
      ) : null}
    </motion.div>
  );
}

function startOffset(enterFrom: DeckAction | undefined) {
  if (!enterFrom || typeof window === "undefined") return STILL;
  if (enterFrom === "save") return { x: 0, y: -window.innerHeight * 1.3 };
  return { x: (enterFrom === "like" ? 1 : -1) * window.innerWidth * 1.3, y: 0 };
}
