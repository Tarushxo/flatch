"use client";

import type { Listing } from "@repo/shared";
import { useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { DeckAction } from "@/lib/deck/gesture";
import { useDeckStore } from "@/lib/deck/store";
import { useDeck } from "@/lib/deck/use-deck";
import { PHOTO_SIZES, photoSrcSet } from "@/lib/photo";
import { ActionBar } from "./action-bar";
import { AmbientGlow } from "./ambient-glow";
import { DeckCard, type DeckCardHandle } from "./deck-card";
import { DeckHints } from "./deck-hints";
import { DeckEmpty, DeckError, DeckLoading } from "./deck-states";

/** Only this many cards are in the page at once. */
const VISIBLE = 3;

const SHORTCUTS = [
  ["←", "pass"],
  ["→", "like"],
  ["↑", "save"],
  ["Z", "undo"],
  ["↓", "details"],
  ["A / D", "photos"],
] as const;

/**
 * The swipe deck: a stack of flats, the buttons under it, and the keyboard
 * shortcuts. `onTopChange` reports which flat is on top (for the desktop side
 * panel) and `onOpenDetails` is called when the person asks for details.
 */
export function SwipeDeck({
  onTopChange,
  onOpenDetails,
}: {
  onTopChange?: (listing: Listing | null) => void;
  onOpenDetails: (listing: Listing) => void;
}) {
  const deck = useDeck();
  const returning = useDeckStore((state) => state.returning);
  const commit = useDeckStore((state) => state.commit);
  const clearReturning = useDeckStore((state) => state.clearReturning);

  const progress = useMotionValue(0);
  const topCard = useRef<DeckCardHandle>(null);
  const [glow, setGlow] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: number; action: DeckAction } | null>(null);

  const top = deck.cards[0] ?? null;
  const visible = deck.cards.slice(0, VISIBLE);

  useEffect(() => {
    onTopChange?.(top);
  }, [top, onTopChange]);

  // With no card on top, nothing is being dragged.
  useEffect(() => {
    if (!top) progress.set(0);
  }, [top, progress]);

  // Warm the cache: the first photo of the next cards and the top card's second
  // photo. They wait a moment and load at low priority, so they never compete
  // with the photo the person is looking at.
  useEffect(() => {
    const urls = [
      deck.cards[0]?.photos[1]?.url,
      ...deck.cards.slice(1, 4).map((card) => card.photos[0]?.url),
    ];
    const timer = setTimeout(() => {
      for (const url of urls) {
        if (!url) continue;
        const image = new Image();
        image.fetchPriority = "low";
        image.sizes = PHOTO_SIZES.deckCard;
        image.srcset = photoSrcSet(url, "card");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [deck.cards]);

  const act = (action: DeckAction) => topCard.current?.flyOut(action);
  const openDetails = () => {
    if (top) onOpenDetails(top);
  };

  // Keyboard shortcuts. The handler lives in a ref so the listener is attached only once
  // but always sees the current deck.
  const keys = useRef<(event: KeyboardEvent) => void>(() => {});
  const handleKey = (event: KeyboardEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    const typing = target?.closest("input, textarea, select, [contenteditable=true]");
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    // While the details sheet (or any dialog) is open, the keys belong to it.
    if (document.querySelector("[role=dialog]")) return;
    // Leave Space and Enter alone when a button or link has focus.
    const onControl = target?.closest("button, a, [role=dialog]");

    switch (event.key) {
      case "ArrowLeft":
        act("pass");
        break;
      case "ArrowRight":
        act("like");
        break;
      case "ArrowUp":
        act("save");
        break;
      case "ArrowDown":
        openDetails();
        break;
      case "z":
      case "Z":
        deck.undo();
        break;
      case "a":
      case "A":
        topCard.current?.showPhoto(-1);
        break;
      case "d":
      case "D":
        topCard.current?.showPhoto(1);
        break;
      case " ":
        if (onControl) return;
        openDetails();
        break;
      default:
        return;
    }
    event.preventDefault();
  };
  useEffect(() => {
    keys.current = handleKey;
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keys.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return (
    <section aria-label="Flats for you" className="relative isolate flex h-full flex-col gap-5">
      <div className="relative mx-auto min-h-0 w-full max-w-[26rem] flex-1">
        <AmbientGlow colour={top ? glow : null} />

        {deck.isLoading ? <DeckLoading /> : null}
        {deck.isError ? <DeckError onRetry={deck.retry} /> : null}
        {deck.isExhausted ? (
          <DeckEmpty
            filtered={deck.isFiltered}
            onRevisit={deck.revisitPassed}
            onClearFilters={deck.clearFilters}
          />
        ) : null}

        {top ? <DeckHints /> : null}

        {visible.map((listing, index) => (
          <DeckCard
            key={listing.id}
            ref={index === 0 ? topCard : undefined}
            listing={listing}
            index={index}
            progress={progress}
            enterFrom={returning?.id === listing.id ? returning.action : undefined}
            onEntered={clearReturning}
            onLeaving={(action) => {
              // Likes and saves get a small celebration; a pass leaves quietly.
              if (action !== "pass") setBurst((last) => ({ id: (last?.id ?? 0) + 1, action }));
            }}
            onCommit={(action) => commit(listing.id, action)}
            onOpenDetails={() => onOpenDetails(listing)}
            onPhotoChange={setGlow}
          />
        ))}
      </div>

      <ActionBar
        disabled={!top}
        canUndo={deck.canUndo}
        burst={burst}
        onAction={act}
        onUndo={deck.undo}
      />

      <ul className="hidden items-center justify-center gap-x-4 gap-y-1 text-fg-3 text-xs lg:flex lg:flex-wrap">
        {SHORTCUTS.map(([key, what]) => (
          <li key={what} className="flex items-center gap-1.5">
            <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6875rem] text-fg-2">
              {key}
            </kbd>
            {what}
          </li>
        ))}
      </ul>
    </section>
  );
}
