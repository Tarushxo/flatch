"use client";

import { countActiveFilters } from "@repo/shared";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useFilterStore } from "./filters";
import { type PendingSwipe, useDeckStore } from "./store";

export const FEED_KEY = ["feed"] as const;
export const SAVED_KEY = ["saved"] as const;
/** Fetch the next page when this many cards are left. */
const REFILL_AT = 4;
const SEND_ATTEMPTS = 3;

/**
 * Everything the deck needs: the cards, loading state, and the actions that
 * talk to the server. Swipes are optimistic: the card leaves at once and the
 * swipe is sent in the background.
 */
export function useDeck() {
  const queryClient = useQueryClient();
  const cards = useDeckStore((state) => state.cards);
  const canUndo = useDeckStore((state) => state.last !== null);
  const outboxSize = useDeckStore((state) => state.outbox.length);
  const addCards = useDeckStore((state) => state.addCards);

  const filters = useFilterStore((state) => state.filters);
  const clearFilters = useFilterStore((state) => state.clearFilters);

  const feed = useInfiniteQuery({
    // One feed per set of filters. Old ones are dropped at once (gcTime 0), so
    // coming back to a filter always asks the server again.
    queryKey: [...FEED_KEY, filters],
    queryFn: ({ pageParam }) => api.getFeed(pageParam, filters),
    gcTime: 0,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  // New filters mean a new deck: drop the cards that belonged to the old ones.
  const filterKey = JSON.stringify(filters);
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return;
    lastFilterKey.current = filterKey;
    useDeckStore.getState().clearCards();
  }, [filterKey]);

  // Move fetched pages into the deck. The store ignores anything it has seen before.
  useEffect(() => {
    if (feed.data) addCards(feed.data.pages.flatMap((page) => page.items));
  }, [feed.data, addCards]);

  // Top up before the deck runs dry. The count is read from the store as it is now, not as
  // it was when this screen was last drawn: when a page arrives, the effect above has just
  // put its cards in, and going by the old count (none) asked for a second page at once,
  // on every visit, in competition with the first photo.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  // biome-ignore lint/correctness/useExhaustiveDependencies: cards.length is what says the deck changed
  useEffect(() => {
    const inHand = useDeckStore.getState().cards.length;
    if (inHand <= REFILL_AT && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [cards.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Send queued swipes in the background.
  useEffect(() => {
    if (outboxSize === 0) return;
    const batch = useDeckStore.getState().takeOutbox();
    void sendWithRetry(batch)
      .then(() => {
        if (batch.some((item) => item.swipe.action === "save")) {
          void queryClient.invalidateQueries({ queryKey: SAVED_KEY });
        }
      })
      .catch(() => {
        useDeckStore.getState().reinstate(batch);
        toast.error("Couldn't save that swipe", {
          description: "The flat is back on top of the deck. Try again in a moment.",
        });
      });
  }, [outboxSize, queryClient]);

  const undo = useCallback(() => {
    const undone = useDeckStore.getState().undo();
    if (undone?.alreadySent) void api.undoSwipe(undone.listingId).catch(() => {});
  }, []);

  /** Bring passed flats back round and start the deck again. */
  const revisitPassed = useCallback(async () => {
    await api.resetPasses();
    useDeckStore.getState().reset();
    await queryClient.resetQueries({ queryKey: FEED_KEY });
  }, [queryClient]);

  const empty = cards.length === 0;
  return {
    cards,
    canUndo,
    undo,
    revisitPassed,
    clearFilters,
    isFiltered: countActiveFilters(filters) > 0,
    retry: () => feed.refetch(),
    isLoading: empty && (feed.isPending || feed.isFetching),
    isError: empty && feed.isError,
    isExhausted: empty && feed.isSuccess && !feed.hasNextPage && !feed.isFetching,
  };
}

async function sendWithRetry(batch: PendingSwipe[]) {
  const swipes = batch.map((item) => item.swipe);
  for (let attempt = 1; ; attempt++) {
    try {
      await api.sendSwipes(swipes);
      return;
    } catch (error) {
      if (attempt >= SEND_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * 3 ** (attempt - 1)));
    }
  }
}
