import {
  ACCEPT_DELAY,
  type Address,
  botAcceptDelay,
  botAccepts,
  botSeed,
  type Listing,
  listerOpener,
  listerReply,
  type Match,
  type Message,
  type PendingLike,
  REPLY_DELAY,
} from "@repo/shared";

/*
 * The bot listers. Every mock flat is listed by a bot, so that a like can turn
 * into a match and a chat without a second real person. This file holds what
 * the bots decide and say, as plain functions of their inputs (the clock is
 * always passed in), so the behaviour can be tested without waiting.
 *
 * From M2 the same rules run on the server for seed listings.
 */

/** A like and what became of it. Times are milliseconds since 1970. */
export type LikeRecord = {
  listingId: string;
  matchId: string;
  likedAt: number;
  /** When the lister says yes, or null if this lister never answers. */
  acceptAt: number | null;
};

/** A message with the moment it becomes visible (bot replies are written ahead of time). */
export type StoredMessage = Message & { visibleAt: number };

/** When this lister says yes to a like made at `likedAt`, or null if never. */
export function acceptTime(listingId: string, likedAt: number): number | null {
  return botAccepts(listingId) ? likedAt + botAcceptDelay(listingId) : null;
}

export {
  ACCEPT_DELAY,
  botAccepts as willAccept,
  listerOpener as openerFor,
  listerReply as replyFor,
  REPLY_DELAY,
};

/** The messages that have "arrived" by now, oldest first, without the bookkeeping. */
export function visibleMessages(thread: StoredMessage[], now: number): Message[] {
  return thread
    .filter((message) => message.visibleAt <= now)
    .sort((a, b) => a.visibleAt - b.visibleAt)
    .map(({ visibleAt: _visibleAt, ...message }) => message);
}

/** How many of the lister's messages arrived after the tenant last looked. */
export function unreadCount(thread: StoredMessage[], lastReadAt: number, now: number): number {
  return thread.filter(
    (message) =>
      message.from === "them" && message.visibleAt <= now && message.visibleAt > lastReadAt,
  ).length;
}

const SOCIETIES = [
  "Sunrise Residency",
  "Lakeview Heights",
  "Maple Court",
  "Palm Grove Apartments",
  "Silver Oak Enclave",
  "Orchid Towers",
];

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th". */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** An invented address for a mock listing. It is only ever given out with a match. */
export function addressFor(listing: Listing): Address {
  const seed = botSeed(listing.id);
  const flat = `${(seed % 9) + 1}${"ABCD"[seed % 4]}`;
  return {
    society: SOCIETIES[seed % SOCIETIES.length] ?? "Sunrise Residency",
    line: `Flat ${flat}, ${ordinal((seed % 12) + 1)} Cross`,
  };
}

/** Whether a like has become a match by now. */
export function isMatched(like: LikeRecord, now: number): boolean {
  return like.acceptAt !== null && like.acceptAt <= now;
}

/** A match as the app sees it, built from a like, its listing and its thread. */
export function toMatch(
  like: LikeRecord,
  listing: Listing,
  thread: StoredMessage[],
  lastReadAt: number,
  now: number,
): Match {
  const messages = visibleMessages(thread, now);
  return {
    id: like.matchId,
    side: "tenant",
    person: { name: listing.lister.name, about: listing.lister.about },
    applicant: null,
    listing,
    address: addressFor(listing),
    matchedAt: new Date(like.acceptAt ?? now).toISOString(),
    lastMessage: messages[messages.length - 1] ?? null,
    unreadCount: unreadCount(thread, lastReadAt, now),
  };
}

export function toPendingLike(like: LikeRecord, listing: Listing): PendingLike {
  return { listing, likedAt: new Date(like.likedAt).toISOString() };
}
