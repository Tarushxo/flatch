import type { Account, FeedFilters, FeedPage, TenantProfile } from "@repo/shared";

/*
 * The app's end of the head start (see early-script.ts). The page asked the
 * server "who is this, and what is on top of their deck?" before this code had
 * even loaded. Each part of that answer is used once, for the first request
 * that would otherwise have gone to the server, and never again: anything
 * asked later must be fresh.
 */

export type EarlyStart = {
  profile: TenantProfile;
  account: Account;
  /** The deck's first cards and the filters they were dealt for. Null away from the deck. */
  deck: { filters: FeedFilters; page: FeedPage } | null;
};

declare global {
  interface Window {
    __flatchStart?: Promise<EarlyStart | null>;
  }
}

const unused = { profile: true, account: true, deck: true };

/** The early answer, the first time this part of it is asked for. Null after that, or if there is none. */
export async function takeEarly(part: keyof typeof unused): Promise<EarlyStart | null> {
  if (!unused[part] || typeof window === "undefined") return null;
  unused[part] = false;
  return (await window.__flatchStart) ?? null;
}

/** Throw the rest of the early answer away: something has changed since it was given. */
export function dropEarly(): void {
  unused.profile = false;
  unused.account = false;
  unused.deck = false;
}

/** Whether two sets of filters ask for the same deck. */
export function sameFilters(a: FeedFilters, b: FeedFilters): boolean {
  const plain = (filters: FeedFilters) =>
    JSON.stringify([filters.city, filters.budgetMax, filters.localities, filters.roomTypes]);
  return plain(a) === plain(b);
}
