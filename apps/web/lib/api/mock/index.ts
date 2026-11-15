import { matchesFilters, type Swipe, type SwipeAction } from "@repo/shared";
import type { Api } from "../client";
import { MOCK_LISTINGS } from "./listings";

/*
 * An in-memory stand-in for the server. It keeps swipes for as long as the
 * page is open and answers after a short delay like a real network would.
 * The mock data is checked against the shared schemas in a test
 * (listings.test.ts), not here, so the validation library is not shipped to
 * the browser.
 */

const PAGE_SIZE = 10;

const swipes = new Map<string, SwipeAction>();
const seenClientIds = new Set<string>();

const ranked = [...MOCK_LISTINGS].sort((a, b) => b.compatibility.percent - a.compatibility.percent);

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export const mockApi: Api = {
  async getFeed(cursor, filters) {
    await delay(180);
    // The cursor is a position in the list of flats that pass the filters.
    const matching = ranked.filter((listing) => matchesFilters(listing, filters));
    const start = cursor ? Number.parseInt(cursor, 10) : 0;
    const window = matching.slice(start, start + PAGE_SIZE);
    const end = start + window.length;
    return {
      items: window.filter((listing) => !swipes.has(listing.id)),
      nextCursor: end < matching.length ? String(end) : null,
    };
  },

  async countFeed(filters) {
    await delay(60);
    return ranked.filter((listing) => !swipes.has(listing.id) && matchesFilters(listing, filters))
      .length;
  },

  async getLocalities() {
    await delay(60);
    return [...new Set(MOCK_LISTINGS.map((listing) => listing.locality))].sort();
  },

  async sendSwipes(batch: Swipe[]) {
    await delay(100);
    for (const swipe of batch) {
      if (seenClientIds.has(swipe.clientId)) continue;
      seenClientIds.add(swipe.clientId);
      // Delete first so a changed decision moves to the end of the order.
      swipes.delete(swipe.listingId);
      swipes.set(swipe.listingId, swipe.action);
    }
  },

  async undoSwipe(listingId) {
    await delay(80);
    swipes.delete(listingId);
  },

  async getSaved() {
    await delay(150);
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
