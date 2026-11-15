import type { Match } from "@repo/shared";
import { create } from "zustand";

/*
 * Which matches still need their "YOU'RE IN" moment. Each match is celebrated
 * once: the first list of matches seen after the app opens is taken as already
 * known (so a reload does not replay old matches), and anything new after that
 * joins the queue.
 */
type CelebrationState = {
  /** Ids already seen, or null before the first list has arrived. */
  known: Set<string> | null;
  /** Matches waiting to be celebrated, oldest first. */
  queue: Match[];
  /** Compare the latest list of matches with what is known. */
  observe: (matches: Match[]) => void;
  /** The moment on screen has been closed. */
  dismiss: () => void;
};

export const useCelebrations = create<CelebrationState>((set, get) => ({
  known: null,
  queue: [],

  observe: (matches) => {
    const { known, queue } = get();
    if (known === null) {
      set({ known: new Set(matches.map((match) => match.id)) });
      return;
    }
    const fresh = matches.filter((match) => !known.has(match.id));
    if (fresh.length === 0) return;
    const next = new Set(known);
    for (const match of fresh) next.add(match.id);
    // The list arrives most recent first; celebrate in the order they happened.
    set({ known: next, queue: [...queue, ...fresh.reverse()] });
  },

  dismiss: () => set((state) => ({ queue: state.queue.slice(1) })),
}));
