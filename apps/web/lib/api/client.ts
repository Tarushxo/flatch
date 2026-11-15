import type { FeedPage, Swipe } from "@repo/shared";
import { mockApi } from "./mock";

/**
 * Everything the app asks the server for. Components and hooks depend on this
 * interface only. In M1 it is backed by an in-memory mock; in M2 the real
 * HTTP client implements the same interface and is swapped in below.
 */
export interface Api {
  /** One page of the ranked feed. Pass the previous page's `nextCursor` to continue. */
  getFeed(cursor: string | null): Promise<FeedPage>;
  /** Record a batch of swipes. Safe to retry: repeats of a `clientId` are ignored. */
  sendSwipes(swipes: Swipe[]): Promise<void>;
  /** Take back a swipe so the listing can be shown again. */
  undoSwipe(listingId: string): Promise<void>;
  /** Forget every pass, so passed flats can come round again. */
  resetPasses(): Promise<void>;
}

export const api: Api = mockApi;
