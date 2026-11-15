import type { FeedFilters, FeedPage, Listing, Swipe } from "@repo/shared";
import { mockApi } from "./mock";

/**
 * Everything the app asks the server for. Components and hooks depend on this
 * interface only. In M1 it is backed by an in-memory mock; in M2 the real
 * HTTP client implements the same interface and is swapped in below.
 */
export interface Api {
  /** One page of the ranked feed. Pass the previous page's `nextCursor` to continue. */
  getFeed(cursor: string | null, filters: FeedFilters): Promise<FeedPage>;
  /** How many flats the filters would leave in the deck. Powers the live counter. */
  countFeed(filters: FeedFilters): Promise<number>;
  /** The areas a tenant can filter by, in alphabetical order. */
  getLocalities(): Promise<string[]>;
  /** Record a batch of swipes. Safe to retry: repeats of a `clientId` are ignored. */
  sendSwipes(swipes: Swipe[]): Promise<void>;
  /** Take back a swipe so the listing can be shown again. */
  undoSwipe(listingId: string): Promise<void>;
  /** The flats the person has saved for later, most recent first. */
  getSaved(): Promise<Listing[]>;
  /** Forget every pass, so passed flats can come round again. */
  resetPasses(): Promise<void>;
}

export const api: Api = mockApi;
