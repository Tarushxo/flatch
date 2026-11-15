import type { Listing, Swipe } from "@repo/shared";
import { create } from "zustand";
import type { DeckAction } from "./gesture";

/** A swipe waiting to be sent, kept with its listing so a failed send can put the card back. */
export type PendingSwipe = { swipe: Swipe; listing: Listing };

type DeckState = {
  /** The deck, top card first. */
  cards: Listing[];
  /** Every listing id that has ever been added, so a refetch cannot re-add a swiped card. */
  known: Set<string>;
  /** The most recent swipe, which is the only one that can be undone. */
  last: PendingSwipe | null;
  /** Swipes not yet sent to the server. */
  outbox: PendingSwipe[];
  /** A card on its way back from an undo, and the direction it left in. */
  returning: { id: string; action: DeckAction } | null;

  addCards: (items: Listing[]) => void;
  /** Remove the card optimistically and queue the swipe. */
  commit: (listingId: string, action: DeckAction) => void;
  /** Bring the last card back. Says whether the swipe had already left the outbox. */
  undo: () => { listingId: string; alreadySent: boolean } | null;
  clearReturning: () => void;
  /** Hand the queued swipes to the sender and empty the queue. */
  takeOutbox: () => PendingSwipe[];
  /** Put cards back on top after their swipes could not be saved. */
  reinstate: (failed: PendingSwipe[]) => void;
  reset: () => void;
};

export const useDeckStore = create<DeckState>((set, get) => ({
  cards: [],
  known: new Set(),
  last: null,
  outbox: [],
  returning: null,

  addCards: (items) =>
    set((state) => {
      const fresh = items.filter((item) => !state.known.has(item.id));
      if (fresh.length === 0) return state;
      const known = new Set(state.known);
      for (const item of fresh) known.add(item.id);
      return { cards: [...state.cards, ...fresh], known };
    }),

  commit: (listingId, action) =>
    set((state) => {
      const listing = state.cards.find((card) => card.id === listingId);
      if (!listing) return state;
      const pending: PendingSwipe = {
        swipe: { clientId: crypto.randomUUID(), listingId, action },
        listing,
      };
      return {
        cards: state.cards.filter((card) => card.id !== listingId),
        last: pending,
        outbox: [...state.outbox, pending],
        returning: null,
      };
    }),

  undo: () => {
    const { last, outbox, cards } = get();
    if (!last) return null;
    const alreadySent = !outbox.some((item) => item.swipe.clientId === last.swipe.clientId);
    set({
      cards: [last.listing, ...cards],
      last: null,
      outbox: outbox.filter((item) => item.swipe.clientId !== last.swipe.clientId),
      returning: { id: last.listing.id, action: last.swipe.action as DeckAction },
    });
    return { listingId: last.listing.id, alreadySent };
  },

  clearReturning: () => set({ returning: null }),

  takeOutbox: () => {
    const { outbox } = get();
    if (outbox.length > 0) set({ outbox: [] });
    return outbox;
  },

  reinstate: (failed) =>
    set((state) => {
      const back = failed
        .map((item) => item.listing)
        .filter((listing) => !state.cards.some((card) => card.id === listing.id));
      const failedIds = new Set(failed.map((item) => item.swipe.clientId));
      return {
        cards: [...back, ...state.cards],
        last: state.last && failedIds.has(state.last.swipe.clientId) ? null : state.last,
      };
    }),

  reset: () => set({ cards: [], known: new Set(), last: null, outbox: [], returning: null }),
}));
