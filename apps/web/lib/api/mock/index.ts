import { FeedPageSchema, type Swipe, type SwipeAction, SwipeSchema } from "@repo/shared";
import type { Api } from "../client";
import { MOCK_LISTINGS } from "./listings";

/*
 * An in-memory stand-in for the server. It keeps swipes for as long as the
 * page is open, answers after a short delay like a real network would, and
 * validates what it sends and receives against the shared schemas so the
 * contract is exercised from day one.
 */

const PAGE_SIZE = 10;

const swipes = new Map<string, SwipeAction>();
const seenClientIds = new Set<string>();

const ranked = [...MOCK_LISTINGS].sort((a, b) => b.compatibility.percent - a.compatibility.percent);

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const mockApi: Api = {
  async getFeed(cursor) {
    await delay(450);
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const window = ranked.slice(start, start + PAGE_SIZE);
    const end = start + window.length;
    return FeedPageSchema.parse({
      items: window.filter((listing) => !swipes.has(listing.id)),
      nextCursor: end < ranked.length ? String(end) : null,
    });
  },

  async sendSwipes(batch: Swipe[]) {
    await delay(200);
    for (const swipe of batch.map((item) => SwipeSchema.parse(item))) {
      if (seenClientIds.has(swipe.clientId)) continue;
      seenClientIds.add(swipe.clientId);
      // Delete first so a changed decision moves to the end of the order.
      swipes.delete(swipe.listingId);
      swipes.set(swipe.listingId, swipe.action);
    }
  },

  async undoSwipe(listingId) {
    await delay(150);
    swipes.delete(listingId);
  },

  async getSaved() {
    await delay(300);
    // A Map keeps insertion order, so reversing gives most recent first.
    const savedIds = [...swipes].filter(([, action]) => action === "save").map(([id]) => id);
    return savedIds.reverse().flatMap((id) => MOCK_LISTINGS.filter((listing) => listing.id === id));
  },

  async resetPasses() {
    await delay(150);
    for (const [listingId, action] of swipes) {
      if (action === "pass") swipes.delete(listingId);
    }
  },
};
